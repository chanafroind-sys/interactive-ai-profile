# Task 06 — Gumroad Webhook & Onboarding Wizard

**Recommended model: Sonnet.** Well-trodden webhook and form work. One exception: have Opus review the HMAC verification and the token flow — both fail silently when wrong.

---

## Objective

A stranger buys on Gumroad and, without you touching anything, ends up with a live profile at `/p/their-username`. Webhook → tenant → emailed setup link → 3-step wizard → ingestion → live.

## Pre-requisites & Context

- Tasks 01–05 complete. Ingestion and chat both working on the demo profile.
- A Gumroad product created; Ping endpoint configurable.
- Resend account, verified sending domain, `RESEND_API_KEY` set.
- `GUMROAD_WEBHOOK_SECRET` set.

---

## Step-by-step instructions

### 1. Webhook — `src/app/api/webhooks/gumroad/route.ts`

`export const runtime = 'nodejs';`

Gumroad Ping posts **form-encoded** data, not JSON. Parse with `await req.formData()`.

Order matters:

1. **Read the raw body before parsing** — HMAC is computed over raw bytes. Parsing first and re-serialising will not reproduce the signature.
2. **Verify HMAC-SHA256** against `GUMROAD_WEBHOOK_SECRET` using a **timing-safe comparison**. A plain `===` is a timing oracle. Reject with 401 on mismatch, and do not touch the database before this passes.
3. **Idempotency — mandatory.** Gumroad retries; duplicate handling creates duplicate tenants and duplicate charges of your goodwill.

```sql
insert into tenants (email, gumroad_sale_id, license_key, status)
values ($1, $2, $3, 'awaiting_setup')
on conflict (gumroad_sale_id) do nothing
returning id;
```

If nothing is returned, this is a retry — fetch the existing tenant and re-send the email rather than erroring.

4. **Return 200 within ~3 seconds.** Do all real work after responding (`waitUntil`). Gumroad treats slow responses as failures and retries.
5. Handle the `refunded` / `disputed` ping: set `status='refunded'` and `profiles.is_published=false`. Building this now costs ten minutes; discovering you need it during a chargeback costs a weekend.

### 2. Onboarding tokens — `src/lib/onboarding/token.ts`

```ts
const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
const hash  = sha256(token);      // store the HASH, never the token
```

- Store `token_hash`, `tenant_id`, `expires_at` (now + 7 days).
- Redeem: hash the incoming token, look it up, check `expires_at` and `used_at`, then set `used_at` and mint a signed session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, scoped to `tenant_id`, 24h).
- Single-use, but **the session cookie must survive the wizard** — a user who refreshes on step 2 and gets logged out will ask for a refund. Redeem the token once, then rely on the cookie.
- Expired or already-used token → a friendly page with a "resend my setup link" button that emails a fresh one to the address on file.

### 3. Email — `src/lib/email.ts`

Resend. Three templates, plain and short:

- **Setup link** — sent immediately after purchase. Do this *in addition to* Gumroad's redirect, because redirects get lost, tabs get closed, and this email is the only path back in.
- **Profile is live** — with the URL and a link to edit.
- **Ingestion failed** — with a link to retry. Never leave a paying customer with silence.

### 4. Wizard shell — `src/app/setup/page.tsx`

Server component: validate token or cookie, load tenant, render the client wizard. Persist progress to the DB after each step so a refresh or a switched device resumes where they left off.

### 5. Step A — CV upload

- Drag-and-drop, PDF only, ≤ 10 MB, validated client- and server-side.
- Request a signed URL from Task 04's endpoint; upload **directly to Supabase Storage**.
- Progress bar. A 10 MB upload on hotel wifi with no feedback reads as a broken app.
- Offer a "skip — I'll enter details manually" escape hatch. Some people don't have a PDF CV to hand, and losing them at step one is expensive.

### 6. Step B — Core questions

Six fields, all optional except username:

| Field | Notes |
|---|---|
| `username` | The `/p/` slug. Live availability check, debounced. Reserved words blocklist (`api`, `setup`, `admin`, `p`, `_next`, `login`, `about`). 3–30 chars, `[a-z0-9-]`. |
| `headline` | Prefilled from CV extraction after ingest |
| `tone` | professional / casual / witty → `persona.tone` |
| `always_mention` | Up to 3 free-text items |
| `never_discuss` | Up to 3 |
| `accent_colour` | Swatch picker. **Clamp the lightness range** so contrast stays ≥ 4.5:1 — don't trust a free colour input. |

`always_mention` / `never_discuss` / `tone` feed the system prompt. The availability and "what are you looking for" answers become the `faq_*` entities from Task 04 §6.

### 7. Step C — API key

- Provider dropdown: OpenAI / Anthropic.
- Password-type input; never echoed back after saving.
- **Validate on submit** via Task 05's `validateKey` before storing. Distinguish invalid key / no credit / network error in the message.
- Encrypt with `encryptApiKey` and write to `credentials`.
- Show a plain-English cost estimate: *"Roughly $0.30 per 100 visitor questions. You're billed by your provider directly — we never charge you for usage."*
- Explicit consent checkbox: *"I understand my API key will be stored encrypted and used only to answer questions on my profile."* Record the timestamp.
- Link to provider key-creation docs, and recommend a **key with a spending cap** set at the provider. Good advice, and it protects you both.

### 8. Generation + review

- On submit, trigger ingestion, then poll `tenants.status` with a progress display naming the real stage ("Reading your CV…", "Building your knowledge base…").
- **Then show an editable review screen** before publishing. LLM CV extraction is ~85–90% accurate, and the remaining 10% is job titles and dates — exactly what a user will be furious about getting wrong on a public professional profile. Editable fields per entity; a "remove" toggle; re-embed only edited entities on save.
- "Publish" sets `is_published=true`, `status='live'`, revalidates the path, sends the live email.

### 9. Commits

```bash
git commit -m "feat: gumroad webhook with HMAC verification and idempotency"
git commit -m "feat: single-use onboarding tokens + session cookie"
git commit -m "feat: transactional emails via resend"
git commit -m "feat: 3-step setup wizard with CV upload and BYOK"
git commit -m "feat: editable review screen before publish"
```

---

## Definition of Done & Verification

### Webhook

```bash
# Valid signature → 200, tenant created
pnpm tsx scripts/test-webhook.ts --valid
# Invalid signature → 401, NO tenant created
pnpm tsx scripts/test-webhook.ts --tampered
# Same sale_id twice → 200 both times, exactly ONE tenant row
pnpm tsx scripts/test-webhook.ts --duplicate
# Refund ping → status='refunded', profile unpublished
pnpm tsx scripts/test-webhook.ts --refund
```

- [ ] Response returns in < 3s
- [ ] Setup email arrives

### Tokens

- [ ] Valid token → wizard loads, cookie set
- [ ] Same token twice → second attempt shows "already used" + resend option
- [ ] Expired token (backdate `expires_at`) → friendly error, not a 500
- [ ] Tampered token → rejected
- [ ] `select token_hash from onboarding_tokens` → hashes only, no plaintext
- [ ] **Refresh mid-wizard → stays logged in** (this is the one people break)

### Full E2E, as a stranger would

Fire a real Gumroad test purchase and complete the whole flow without touching the database manually:

- [ ] Email arrives → wizard opens
- [ ] CV uploads with progress feedback
- [ ] Username collision is caught before submit
- [ ] Reserved username (`api`) is rejected
- [ ] Bad API key → clear, specific error; wizard doesn't advance
- [ ] Good API key → validated and stored encrypted
- [ ] Ingestion runs; progress named honestly
- [ ] Review screen shows real extracted data; edits persist and re-embed
- [ ] Publish → `/p/{username}` live, chat answers correctly using **their** key
- [ ] Total time from purchase to live profile: **under 5 minutes**

### Security

- [ ] `credentials` row has no plaintext key anywhere (inspect the raw row)
- [ ] Wizard endpoints reject a request for a tenant the cookie doesn't own
- [ ] `scripts/verify-rls.ts` still passes
- [ ] Webhook rejects a replayed body with a stale timestamp, if Gumroad supplies one

## Common failure modes

- **HMAC never matches** — you parsed the body before hashing it. Read raw bytes first.
- **Duplicate tenants** — `on conflict do nothing` was written against the wrong unique column, or `gumroad_sale_id` isn't actually unique.
- **User logged out on refresh** — you're re-validating the single-use token on every page load instead of relying on the session cookie.
- **Gumroad retries forever** — you're doing ingestion inline and blowing the response timeout. Return 200 first, work after.
