# Task 07 — Semantic Caching & Security Safeguards

**Recommended model: Sonnet, then an Opus threat-model review.** The implementation is straightforward; judging whether it's *sufficient* is not. The Opus prompt is in §Verification.

---

## Objective

Fill in the three stubs Task 05 left in the chat endpoint: rate limiting, semantic cache, daily quota. Add Turnstile. The result: your public chat endpoint stops being an open, unauthenticated LLM proxy funded by your customer's credit card.

## Pre-requisites & Context

- Tasks 01–06 complete. Full purchase→live flow working.
- Cloudflare account with KV access.
- The stub call sites in `src/app/api/chat/route.ts` (steps 2, 3, 5) — this task implements them **in place**, without reordering.

**Framing:** the semantic cache is not an optimisation. On a BYOK product it is a headline feature — every cache hit is money your customer doesn't spend. Build it as a feature, measure it, and put the number on your landing page.

---

## Step-by-step instructions

### 1. KV namespaces

```bash
npx wrangler kv namespace create RATE_LIMIT_KV
npx wrangler kv namespace create SEMANTIC_CACHE_KV
```

Paste the returned IDs into `wrangler.jsonc` and **uncomment the `kv_namespaces` block** left as a placeholder in Task 01. Add preview IDs for local dev.

### 2. Rate limiter — `src/lib/ratelimit.ts`

Sliding window in KV, keyed on `ip + profile_id`:

| Window | Limit |
|---|---|
| 5 minutes | 10 messages |
| 24 hours | 40 messages |

- IP from `CF-Connecting-IP` (trustworthy on Cloudflare) with `x-forwarded-for` as a dev fallback.
- Store a compact array of timestamps; prune on read; set KV TTL to the window length so entries self-clean.
- Return `{ allowed, retryAfter, remaining }`.
- On a block, respond **429 with a `Retry-After` header** and a friendly SSE `error` — never a bare status code the widget renders as a crash.
- **Fail open on a KV error.** A KV outage should degrade to "unlimited", not "site down". Log it loudly.

### 3. Semantic cache — `src/lib/cache.ts`

The highest-leverage code in this task.

```
key:   cache:{profile_id}:{sha256(normalised_query).slice(0,16)}
value: { queryEmbedding: number[], reply: string, ui: UiAction[], createdAt }
```

Two-layer lookup:

1. **Exact match** on normalised query (lowercased, trimmed, punctuation stripped) — free, no embedding call.
2. **Semantic match** — embed the query, compare against cached embeddings for this profile at **cosine ≥ 0.95**. Keep a per-profile index key listing recent cache entries so you're comparing against tens of vectors, not scanning KV.

Details:

- TTL 7 days. **Invalidate the whole profile's cache on any profile edit** — a stale answer describing a job the user just deleted is worse than a slow one.
- Cap at ~200 entries per profile; evict oldest.
- Never cache an errored or empty response.
- Cache the `ui` actions alongside the text — replay must reproduce the *visual* answer, not just the words. Re-validate cached IDs against the current entity map on replay (cheap insurance against a partially-invalidated cache).
- Emit `done` with `{"cached": true}` so you can measure the hit rate.
- **Add a small artificial delay on replay** (~250ms) or stream the cached text token-by-token. An instant, complete answer reads as canned; the same text streamed reads as thoughtful. This is a real UX difference for a product whose whole appeal is feeling alive.

Expect 50–80% hit rates on a profile with traffic. Log hits/misses to `usage_counters.cache_hits`.

### 4. Daily quota — `src/lib/quota.ts`

Per-profile hard cap (default 300 messages/day) in `usage_counters`.

- On breach: do **not** error. Return a graceful degraded response — *"The AI assistant has hit its daily limit. Here's {name}'s full profile below, and you can reach them at {contact}."* The profile stays fully browsable; only the chat rests.
- Notify the owner by email on first breach of a day, with a link to raise the cap.
- Make the cap owner-configurable later; ship with a fixed default.

You are spending someone else's money. A cap is a product feature, not a nicety — and its absence is how a scraped profile turns into a chargeback.

### 5. Turnstile — `src/components/chat/Turnstile.tsx`

- Invisible widget, loaded lazily, rendered after the **3rd message** in a session. Humans never notice; scripts stop dead.
- Verify the token server-side against `https://challenges.cloudflare.com/turnstile/v0/siteverify` before processing message 4+.
- Bind the verified state to the session for 1 hour so a real visitor isn't re-challenged mid-conversation.
- **Fail open on a Turnstile API outage** — with the rate limiter and quota still in force, that's an acceptable risk. A hard fail would take chat down for everyone.

### 6. Input hardening — in `src/app/api/chat/route.ts`

- `message` ≤ 500 chars, rejected before any embedding or LLM call.
- History capped at the last 6 turns.
- `max_tokens` fixed server-side at 600. Never from the request body.
- Reject non-`application/json` content types.
- Strip control characters and zero-width unicode from the message — a cheap block on a whole class of prompt-injection smuggling.

### 7. Owner controls — `src/app/dashboard/`

Minimal, but ship it:

- **Kill switch** — `profiles.chat_enabled` boolean. One click disables the agent while keeping the profile live. This is what a customer will demand at 2am after a bad interaction, and having it converts a crisis into a shrug.
- **Transcript view** — recent `chat_messages` for their profile.
- Usage today vs cap; cache hit rate.

Add the `chat_enabled` column in a new migration and check it in the chat endpoint.

### 8. Abuse monitoring

- Log to `usage_counters`: messages, cache hits, tokens in/out, blocked requests.
- Sentry alert if a single profile exceeds 200 messages/day or a single IP exceeds 100 across all profiles.
- Confirm the Sentry `beforeSend` scrubber strips `sk-[A-Za-z0-9]{20,}` and `Authorization` headers.

### 9. Health cron

Verify the Task 01 cron (`0 */6 * * *`) is hitting `/api/health` in production. This is what stops Supabase pausing the project after 7 idle days and taking every customer's profile offline.

```bash
npx wrangler deployments list
npx wrangler tail   # watch a scheduled invocation land
```

### 10. Commits

```bash
git commit -m "feat: KV sliding-window rate limiter"
git commit -m "feat: semantic response cache with embedding similarity"
git commit -m "feat: per-profile daily quota with graceful degradation"
git commit -m "feat: turnstile bot protection after 3rd message"
git commit -m "feat: owner dashboard with kill switch and transcripts"
git commit -m "chore: abuse monitoring + sentry key scrubbing"
```

---

## Definition of Done & Verification

### Rate limiting

```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code} " -X POST localhost:3000/api/chat \
    -H 'Content-Type: application/json' \
    -d '{"profile_id":"<uuid>","session_id":"<uuid>","message":"test '$i'"}'
done
# Expect: 200 ×10 then 429 ×5, with Retry-After present
```

- [ ] A different IP is unaffected
- [ ] Simulated KV failure → fails **open**, logs an error

### Semantic cache — the money test

```bash
pnpm tsx scripts/test-cache.ts
```

Ask these in sequence and assert cache behaviour:

```
"What is your experience with Docker?"     → MISS
"What is your experience with Docker?"     → HIT (exact)
"what's your docker experience?"           → HIT (semantic, ≥0.95)
"Tell me about your Docker background"     → HIT (semantic)
"What about Kubernetes?"                   → MISS  ← must NOT false-hit
```

- [ ] Hits replay the **same `ui` actions**, and the visuals fire identically
- [ ] Hit rate logged to `usage_counters.cache_hits`
- [ ] Editing the profile purges its cache — verify the next identical question is a MISS
- [ ] Errored responses are never cached
- [ ] A cached reply referencing a since-deleted entity has that ID dropped on replay

The `"What about Kubernetes?"` case is the one that matters. If your threshold false-hits there, lower it to 0.97 — a wrong cached answer is far worse than an extra API call.

### Quota

- [ ] Set the cap to 3, send 4 messages → 4th returns the graceful degraded reply, **not** an error
- [ ] Profile page still fully browsable with chat capped
- [ ] Owner notification email fires once, not per request

### Turnstile

- [ ] Messages 1–3 pass without a challenge
- [ ] Message 4 without a valid token → rejected
- [ ] With a valid token → passes, and stays valid for the session
- [ ] Simulated Turnstile outage → fails open

### Input hardening

- [ ] 5000-char message → 400 before any LLM call (check no provider request was made)
- [ ] `Content-Type: text/plain` → 400
- [ ] Zero-width characters stripped
- [ ] `max_tokens: 100000` in the body → ignored, server value used

### The Opus threat-model review

```
/model opus
Read src/app/api/chat/route.ts, src/lib/ratelimit.ts, src/lib/cache.ts and
src/lib/quota.ts.

Threat-model this endpoint as a public, unauthenticated LLM proxy funded by
a third party's API key. For each of these, state whether it is mitigated,
cite the code, and rate the residual risk:
1. Scraper obtaining free inference on the owner's key
2. Prompt-injection exfiltrating the key or the system prompt
3. Jailbreak causing reputational damage to the profile owner
4. Cache poisoning across sessions or across tenants
5. Cost blowup on my own (embedding) key

Then list anything I have missed, ordered by expected loss.
```

Act on anything it rates medium or above.

### Production smoke test

```bash
pnpm deploy
npx wrangler tail
```

- [ ] Full purchase → live profile → chat flow works on the real domain
- [ ] Rate limiting works with real Cloudflare IPs
- [ ] Cron fires and `/api/health` returns 200
- [ ] Sentry receives an error with the key scrubbed

## Common failure modes

- **Cache false-hits across different questions** — threshold too low, or you're comparing against other profiles' entries. The key must be namespaced by `profile_id`.
- **Rate limiter blocks everyone** — you keyed on `CF-Connecting-IP` but it's absent locally, so every dev request shares the `undefined` key.
- **Turnstile blocks real users** — you're verifying on every message instead of binding the verified state to the session.
- **Cache serves deleted entities** — you're not purging on profile edit *and* not re-validating IDs on replay. Do both.
