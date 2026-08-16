# Task 04 — Ingestion Pipeline & RAG

**Recommended model: Opus.** Extraction schema design, ID stability on re-ingest, and retrieval quality tuning all involve real judgement, and mistakes here are expensive to unwind. Use plan mode first.

---

## Objective

A CV PDF goes in; a fully populated profile comes out — structured entities, stable IDs, embedded chunks, regenerated `profile_json`, source PDF deleted. Plus a retrieval function that returns the right chunks for realistic questions.

## Pre-requisites & Context

- Tasks 01–03 complete. `/p/demo` renders from the fixture.
- `GEMINI_API_KEY` in `.env.local`.
- Read `conventions.md` §Entity IDs and §Embeddings — the ID rules in this task are load-bearing for the entire product.

**The key architectural decision, restated:** you do *not* chunk the CV with a sliding window. You extract it into typed entities first, then create one chunk per entity. Sliding-window chunking destroys the entity↔UI linkage that the whole visual layer depends on.

---

## Step-by-step instructions

### 1. Dependencies

```bash
pnpm add unpdf
```

`unpdf` is a serverless-friendly PDF text extractor with no Node-native bindings. `pdf-parse` and `pdfjs-dist` will fight you in the Workers runtime.

### 2. Signed upload — `src/app/api/ingest/upload-url/route.ts`

Return a signed Supabase Storage upload URL for `cvs/{tenant_id}/{uuid}.pdf`. The browser uploads **directly to Supabase**, never through your Worker — Workers have request body limits and CPU caps that a 10 MB PDF will hit.

Validate: PDF mime type, ≤ 10 MB, caller owns the tenant (session cookie from Task 06; for now, accept a `tenant_id` and add the check as a TODO).

### 3. Text extraction — `src/lib/ingest/extract-text.ts`

```ts
import { extractText, getDocumentProxy } from 'unpdf';
```

Download from Storage, extract, normalise whitespace, strip null bytes.

**Guard the empty-text case.** A scanned/image-only CV yields near-zero characters. If `text.length < 200`, fail the job with a user-facing message: *"We couldn't read text from this PDF — it looks like a scan. Please upload a text-based PDF or paste your details manually."* Silently producing an empty profile is the worst possible outcome here.

### 4. Structured extraction — `src/lib/ingest/extract-entities.ts`

**One** Gemini call, on **your** key (`GEMINI_API_KEY`), with a strict `responseSchema`. Use `gemini-2.5-flash` or equivalent — this is a cheap, high-volume-tolerant task.

Response schema mirrors `Entity[]`:

```
experiences: [{ company, title, start_date, end_date, summary, tech[], highlights[] }]
projects:    [{ name, description, tech[], url, metrics[] }]
skills:      [{ name, category, years }]
education:   [{ institution, degree, end_year }]
awards:      [{ name, year, description }]
display_name, headline
```

Rules to put in the prompt:

- Dates in `YYYY-MM` or `YYYY`. `null` for present/ongoing, never a guess.
- **Never invent.** Omit missing fields rather than inferring them. A hallucinated job title on someone's public professional profile is the failure that generates refunds.
- Normalise technology names to canonical form (`K8s` → `Kubernetes`, `postgres` → `PostgreSQL`) so `skill_*` IDs stay consistent across profiles.

Set `temperature: 0`.

### 5. ID assignment — `src/lib/ingest/assign-ids.ts`

Deterministic slugs per `conventions.md`. Then the critical part:

**On re-ingest, preserve existing IDs.** Load the profile's current entities, match new ones on normalised (title + company + start year), and reuse the old ID on a match. Only mint new IDs for genuinely new entities.

Regenerating IDs orphans every semantically cached response, breaks any shared link that referenced an entity, and silently degrades retrieval. Write a unit test for this specific behaviour — it's the kind of thing that works today and breaks in three months.

Handle collisions by appending `_2`, `_3`.

### 6. Synthetic entities — `src/lib/ingest/synthesize.ts`

Two things every profile needs that aren't in the CV:

- **`summary`** — a ~150-word first-person overview generated from the extracted entities. This chunk is **always injected into the context regardless of retrieval score**. Without it, "tell me about yourself" retrieves three arbitrary projects and the answer is incoherent.
- **`faq_*`** — one entity per setup question from Task 06 (availability, what they're looking for, location/remote preference). These get the highest question volume on a live profile and appear nowhere in a CV.

### 7. Chunk building — `src/lib/ingest/build-chunks.ts`

One chunk per entity. The text must be **self-contained** — retrieval returns it with no surrounding context, so it must carry its own dates and employer or the model will misattribute them.

Template:

```
{Title} at {Company}, {start} – {end}. {summary}
Technologies: {tech}. {highlights joined}
```

Target 80–300 tokens. If an entity exceeds ~400 tokens, split it into `{id}#1`, `{id}#2` — both keep the **same `entity_id`**, so both still map to one UI element. Only the chunk rows differ.

### 8. Embeddings — `src/lib/embeddings.ts`

```ts
// gemini-embedding-001, outputDimensionality: 1536
// taskType: 'RETRIEVAL_DOCUMENT' for chunks
// taskType: 'RETRIEVAL_QUERY'    for user questions
```

Two non-obvious points:

- **`taskType` matters.** Using `RETRIEVAL_DOCUMENT` for queries measurably degrades results. Two separate exported functions, not one with a flag people forget to set.
- Batch chunk embedding in one request. Retry with exponential backoff on 429; the free tier is generous but bursty ingests can trip it.

Assert `vector.length === 1536` before writing. A dimension mismatch inserts successfully in some drivers and then returns silent garbage from every similarity query.

### 9. Orchestrator — `src/app/api/ingest/route.ts`

Node runtime, not edge:

```ts
export const runtime = 'nodejs';
export const maxDuration = 300;
```

Pipeline, with `tenants.status` updated at each stage so the setup wizard can poll:

```
extract text → extract entities → assign IDs (preserving) → synthesize
  → upsert entities → build chunks → embed batch → replace chunks
  → regenerate profile_json → revalidatePath(`/p/${username}`)
  → delete source PDF → status='live'
```

Wrap entity+chunk writes in a transaction (or a `security definer` RPC). **Delete-then-insert chunks for the profile** rather than diffing — simpler and always correct.

Every failure path must write a user-readable `tenants.last_error`. "Something went wrong" after a paid purchase is a refund.

### 10. Retrieval — `src/lib/retrieval.ts`

```ts
export async function retrieve(profileId: string, query: string) {
  const embedding = await embedQuery(query);            // RETRIEVAL_QUERY
  const { data } = await db().rpc('match_chunks', {
    p_profile_id: profileId, p_embedding: embedding,
    p_query: query, p_match_count: 8,
  });
  // ALWAYS prepend the summary chunk, deduped
  return withSummary(profileId, data);
}
```

### 11. Eval harness — `scripts/eval-retrieval.ts`

20 realistic questions against the demo profile with expected `entity_id`s:

```
"What's your experience with Docker?"  → exp_acme_2021, proj_k8s_migration
"Where did you study?"                 → edu_*
"Are you available for work?"          → faq_availability
"Tell me about yourself"               → summary
"Do you know K8s?"                     → skill_kubernetes   ← tests lexical arm
"What's your biggest achievement?"     → (any project with metrics)
```

Report recall@8. **Target ≥ 85%.** Below that, the chat will feel dumb no matter how good the prompt is — fix retrieval here, not with prompt engineering in Task 05.

Include at least three acronym/short-token queries (`K8s`, `CI/CD`, `gRPC`). These are the ones pure vector search fails and the lexical arm of `match_chunks` exists to catch. If they don't pass, your `tsv` column or `plainto_tsquery` wiring is wrong.

### 12. Commits

```bash
git commit -m "feat: PDF text extraction with scanned-document guard"
git commit -m "feat: LLM entity extraction with strict schema"
git commit -m "feat: stable entity ID assignment with re-ingest preservation"
git commit -m "feat: gemini embeddings + entity-first chunk builder"
git commit -m "feat: ingestion orchestrator + hybrid retrieval"
git commit -m "test: retrieval eval harness"
```

---

## Definition of Done & Verification

```bash
pnpm typecheck && pnpm test
```

End-to-end with a real CV (use your own):

```bash
pnpm tsx scripts/test-ingest.ts ./fixtures/sample-cv.pdf
```

- [ ] Entities extracted with correct companies, titles and dates — **read them; don't just count rows**
- [ ] Every ID matches the `conventions.md` pattern
- [ ] `chunks` row count ≈ entity count; every embedding is 1536-dim
- [ ] `summary` and at least one `faq_*` entity exist
- [ ] `profile_json` regenerated; `/p/{username}` renders the real CV
- [ ] Source PDF deleted from the `cvs` bucket
- [ ] `tenants.status = 'live'`

Idempotency and ID stability:

```bash
# Run the SAME CV through twice
pnpm tsx scripts/test-ingest.ts ./fixtures/sample-cv.pdf
# Assert: identical entity IDs, no duplicate entities, no orphaned chunks
```

Retrieval quality:

```bash
pnpm tsx scripts/eval-retrieval.ts    # recall@8 ≥ 85%
```

Failure handling:

- [ ] A scanned/image-only PDF → clean user-facing error, `status='failed'`, `last_error` set
- [ ] A non-CV PDF (random document) → either a sensible minimal profile or a clean failure, never a crash
- [ ] A 12 MB PDF → rejected at the signed-URL step

## Common failure modes

- **Every retrieval returns the same chunks** — embeddings were written with the wrong `taskType`, or all-zero vectors were silently inserted. Check a raw vector in SQL.
- **Acronym queries fail** — the lexical arm isn't firing. Verify `tsv` is populated and `plainto_tsquery('english','K8s')` returns a non-empty query.
- **Re-ingest creates duplicates** — the composite PK upsert is targeting the wrong conflict columns. Must be `on conflict (profile_id, id)`.
- **Dates come back as invented values** — the extraction prompt isn't forbidding inference strongly enough, or temperature isn't 0.
