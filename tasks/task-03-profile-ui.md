# Task 03 — Core Profile UI

**Recommended model: Sonnet.** High volume of well-specified component code, low architectural risk. Use Haiku for repetitive styling passes if you want to save budget.

---

## Objective

`/p/demo` renders a complete, visually striking profile from `profile_json`: interactive timeline, tech-stack grid, project cards, code snippets. Every element carries a `data-entity-id` and exposes an imperative handle so Task 05's AI actions can drive it. Page is edge-cached and hits the database at most once per revalidation window.

**No AI yet.** Build a debug panel that fires UI actions manually — that's what proves the contract works.

## Pre-requisites & Context

- Tasks 01 and 02 complete. Demo fixture seeded.
- Read `tasks/reference/ui-action-contract.md` in full. This task **implements** the frontend half of that contract and freezes it.

---

## Step-by-step instructions

### 1. Page shell — `src/app/p/[username]/page.tsx`

Server component. Fetch the profile by username with the service client, `notFound()` if missing or unpublished, pass `profile_json` to a client component.

```tsx
export const revalidate = 3600;
export const dynamicParams = true;
```

One database read per hour per profile. Profile views must not touch Postgres in the common case — this is what keeps you inside Supabase's free egress and compute budget.

Add `generateMetadata` for OG tags (name, headline, avatar). A profile link shared on LinkedIn that renders a blank preview card is a lost customer.

### 2. Provider — `src/components/profile/ProfileProvider.tsx`

Client component. Holds:

- `profile: ProfileJSON`
- `entityMap: Map<string, Entity>` (built once with `useMemo`)
- Highlight state: `focusedTimeline: Set<string>`, `revealedCards: string[]`, `spotlitTools: Set<string>`, `openSnippet: string | null`
- `dispatch(action: UiAction)` — the single entry point, implementing the registry from the contract
- `resetView()`

Expose via context. Every visual component reads from it. **Do not** let components manage their own highlight state; centralising it is what makes `reset_view` reliable.

### 3. Timeline — `src/components/profile/Timeline.tsx`

- Vertical spine on mobile, alternating left/right on desktop.
- One node per `kind === 'experience' | 'education'`, sorted by start date descending.
- Each node: `data-entity-id={entity.id}`, company/institution, title, date range, 1–2 line summary, tech chips.
- States: `default`, `focused` (accent ring + subtle pulse), `dimmed` (opacity 40%, grayscale).
- `scrollTo(id)` uses `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- Intersection-observer reveal on first scroll — but only when `prefers-reduced-motion` is unset.

### 4. Tech grid — `src/components/profile/ToolGrid.tsx`

- Responsive grid of chips, one per `kind === 'skill'`.
- Group by `meta.category` (language / framework / datastore / infra / tooling).
- Icon via `simple-icons` slug in `meta.icon`, with a lettered fallback tile. **Do not hotlink logos from vendor sites.**
- States: `default`, `spotlit` (accent background, scale 1.05), `dimmed`.

### 5. Card panel — `src/components/profile/CardPanel.tsx`

- Right-hand column on desktop; a sheet that slides up on mobile.
- Renders `kind === 'project'` cards: title, description, tech chips, metrics, optional link.
- Cards mount hidden. `reveal(id)` animates in; the stagger is applied by the caller (120ms per card).
- Empty state matters — before the first question this panel shows the 2–3 featured projects, not blank space.

### 6. Code panel — `src/components/profile/CodePanel.tsx`

- Renders `kind === 'snippet'` in a collapsible block.
- Highlight with `shiki` at **build/server time**, not in the browser — client-side highlighters are heavy and you're on a 100 GB bandwidth budget.

### 7. Metrics — `src/components/profile/MetricStat.tsx`

Animated count-up for `meta.value`. Respect `prefers-reduced-motion` (render the final value immediately).

### 8. Chat widget shell — `src/components/chat/ChatWidget.tsx`

Visual only this task. Pinned bottom bar that expands to a conversation panel. Message list, input, send button, typing indicator. Wire it to a **local mock** that returns canned `{reply, ui[]}` after 800ms. Task 05 swaps the mock for the real SSE stream.

Include 3–4 suggested starter questions as chips ("What's your experience with Docker?"). Real visitors don't know what to ask, and an empty chat box converts badly.

### 9. Debug action panel — `src/components/profile/DebugActions.tsx`

Only renders when `process.env.NODE_ENV === 'development'`. Buttons that dispatch each action in the vocabulary against real fixture IDs.

This is the deliverable that actually matters. If every action produces the right visual result here, Task 05 becomes a thin layer over a proven system. Do not skip it.

### 10. "Build your own" CTA

Discreet pinned footer link → `/` (marketing page, later). Low-key, always visible, `rel="noopener"`.

### 11. Accessibility & motion

- `aria-live="polite"` on the card panel — the AI changes visible content and screen readers must be told.
- Full keyboard navigation of timeline nodes and chips.
- Every animation gated behind `prefers-reduced-motion`.
- Check accent-on-background contrast ≥ 4.5:1. Users pick their own accent colour in Task 06, so clamp the lightness range rather than trusting their choice.

### 12. Commits

```bash
git commit -m "feat: profile page shell with ISR caching and OG metadata"
git commit -m "feat: timeline, tech grid, card panel, code panel components"
git commit -m "feat: ProfileProvider ui-action registry + debug panel"
git commit -m "feat: chat widget shell with mock responses"
```

---

## Definition of Done & Verification

```bash
pnpm typecheck && pnpm lint && pnpm build
pnpm dev   # visit /p/demo
```

**Manual verification via the debug panel** — walk every action:

- [ ] `focus_timeline` with 1 ID → scrolls, pulses that node, dims the others
- [ ] `focus_timeline` with 2 IDs → both highlighted, scrolls to the first
- [ ] `show_cards` with 3 IDs → staggered reveal, ~120ms apart
- [ ] `highlight_tools` → correct chips spotlit, rest dimmed
- [ ] `show_code` → snippet expands, correctly highlighted
- [ ] `reset_view` → everything returns to default, no residue
- [ ] **Unknown action** (`{"action":"teleport","ids":["x"]}`) → silently ignored, no console error, no crash
- [ ] **Unknown ID** (`{"action":"show_cards","ids":["proj_nonexistent"]}`) → ignored, no crash

The last two are the forward-compatibility guarantees the whole contract rests on. Test them explicitly.

Then:

```bash
pnpm preview    # /p/demo must render identically through the Workers runtime
```

- [ ] `/p/nonexistent` → 404, not a 500
- [ ] An unpublished profile → 404
- [ ] Lighthouse on `/p/demo`: Performance ≥ 90, Accessibility ≥ 95
- [ ] Mobile viewport (375px) — timeline, grid and card sheet all usable
- [ ] View source: `profile_json` content is present in the HTML (proves hydration, and proves the page is indexable)
- [ ] Second load of `/p/demo` issues **no** new Supabase query (check the Supabase dashboard's request log)

## Common failure modes

- **Highlight state leaks between questions** — you kept state in individual components instead of the provider. Fix now; it gets much worse with real AI traffic.
- **Layout shift when cards reveal** — reserve the panel's height, or animate `opacity`+`transform` only. Never animate `height` on a list.
- **ISR not working under Workers** — `pnpm dev` caching behaviour differs from the Workers runtime. Only `pnpm preview` tells you the truth.
