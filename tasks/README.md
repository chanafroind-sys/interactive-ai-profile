# Execution Roadmap — Interactive AI Profile SaaS

Seven sequential tasks, each a self-contained brief for Claude Code. Feed them **one at a time**. Do not skip ahead — every task assumes the previous one is committed and verified.

## How to run a task

```bash
cd profile-ai
claude
```

Then, in the session:

```
Read tasks/task-01-setup.md and execute it completely.
Follow the Definition of Done and run every verification command before you finish.
Stop and ask me if any verification fails.
```

Start each task in a **fresh session** (`/clear` between tasks). The task file plus `CLAUDE.md` carry all the context needed; a stale session just burns tokens and drags old mistakes forward.

## Model recommendations

Set with `/model` at the start of each session.

| Task | Model | Why |
|---|---|---|
| 01 — Project Setup | **Sonnet** | Mechanical scaffolding, well-trodden commands. |
| 02 — Database & Storage | **Sonnet** → Opus review | DDL is pre-written; RLS correctness is security-critical, so review with Opus. |
| 03 — Profile UI | **Sonnet** | High volume of well-specified component code. |
| 04 — Ingestion & RAG | **Opus** | Extraction schema, chunking strategy and hybrid-retrieval SQL involve real judgement. |
| 05 — Chat Engine & BYOK | **Opus** | Hardest task in the project: crypto, SSE stream parsing, security-critical. |
| 06 — Gumroad & Onboarding | **Sonnet** | Standard webhook + form work. Verify HMAC logic carefully. |
| 07 — Caching & Safeguards | **Sonnet** → Opus review | Straightforward to build; ask Opus to threat-model the result. |

Rules of thumb:

- Use **plan mode** (`Shift+Tab` twice) before Opus tasks — review the plan, then let it run.
- Drop to **Haiku** for isolated grunt work (renaming, formatting, writing a test fixture).
- The "Opus review" pass is one prompt: `/model opus` then *"Review the RLS policies in supabase/migrations/ against tasks/task-02-schema.md §Security invariants. List anything that violates them."*

## Task order and dependencies

```
01 Setup ──► 02 Database ──► 03 Profile UI ──► 04 Ingestion/RAG ──┐
                    │                                             │
                    └──────────────────────────────────► 05 Chat Engine
                                                                  │
                                                    06 Gumroad ◄───┘
                                                          │
                                                    07 Safeguards
```

Task 03 can be built in parallel with 04 if you want, since 03 works off a seeded fixture. Everything else is strictly sequential.

## Reference documents

- `tasks/reference/ui-action-contract.md` — the Visual-AI wire format. Tasks 03, 05 and 07 all depend on it. **This is the contract; treat it as frozen** once Task 03 ships.
- `tasks/reference/conventions.md` — entity ID rules, env var names, file layout. Read once, then let `CLAUDE.md` enforce it.

## Before you start

You need accounts (all free) for: GitHub, Cloudflare, Supabase, Google AI Studio (Gemini key), Resend, Gumroad. Have them open. Task 01 will ask for credentials.

## A note on scope discipline

The single biggest risk to this project is not technical — it's building Task 05's chat engine before Task 03's UI exists to drive. The whole product is the *visual* reaction to the AI. Resist reordering.
