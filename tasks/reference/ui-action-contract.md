# Visual-AI Action Contract — v1

**Frozen after Task 03.** Tasks 03, 05 and 07 all implement against this. Changing it later invalidates every cached response.

## Core principle

The LLM never generates visual content. It **selects** it, by ID. The browser already holds every timeline event, card, tool chip and snippet at page load; the AI only says which ones to reveal.

This buys: no hallucinated cards, ~10x fewer output tokens, instant rendering, and a frontend simple enough that a no-code builder could execute it.

## Action vocabulary — closed enum

| Action | Payload | Frontend behaviour |
|---|---|---|
| `focus_timeline` | `ids: string[]` | Scroll to first ID, pulse-highlight all, dim the rest |
| `show_cards` | `ids: string[]` | Reveal project cards in side panel, 120ms stagger |
| `highlight_tools` | `ids: string[]` | Spotlight chips in tech grid, dim others |
| `show_code` | `id: string` | Expand syntax-highlighted snippet |
| `show_metric` | `id: string` | Animated stat counter |
| `open_link` | `id: string` | Reveal a CTA button — **never auto-navigate** |
| `reset_view` | — | Clear all highlights, return to default |

**Unknown actions must be ignored silently.** This forward-compatibility rule is what lets you add visuals later without breaking cached responses or in-flight sessions.

## Wire format

Model output, after the sentinel:

```json
{
  "v": 1,
  "ui": [
    { "action": "focus_timeline",  "ids": ["exp_acme_2021"] },
    { "action": "highlight_tools", "ids": ["skill_docker", "skill_k8s"] },
    { "action": "show_cards",      "ids": ["proj_k8s_migration"] }
  ]
}
```

## Transport: SSE

```
event: token  data: {"t":"I ran the Docker"}
event: token  data: {"t":" migration at Acme…"}
event: ui     data: {"action":"focus_timeline","ids":["exp_acme_2021"]}
event: ui     data: {"action":"show_cards","ids":["proj_k8s_migration"]}
event: done   data: {"cached":false,"tokens":412}
event: error  data: {"message":"The assistant is unavailable right now."}
```

`error` carries a user-safe string only. Never leak provider errors, stack traces or key state to the browser.

## Generation strategy: sentinel block

The model writes prose, then a delimited JSON block:

```
Docker has been central to my work for about four years…

⟦UI⟧{"v":1,"ui":[{"action":"show_cards","ids":["proj_k8s_migration"]}]}
```

Server-side stream handling:

1. Buffer incoming deltas. Everything **before** `⟦UI⟧` streams out as `token` events.
2. Once the sentinel appears, stop emitting tokens; accumulate the remainder.
3. On stream close, `JSON.parse` the accumulated tail.
4. **On parse failure: drop it silently and emit `done`.** The visitor still gets a correct text answer. Degrade to text-only, never to an error.
5. Watch for the sentinel arriving split across chunk boundaries — match against the running buffer, not the individual delta.

## Prompt-side constraint

Inject only the IDs actually retrieved, as a manifest:

```
AVAILABLE UI ELEMENTS (you may reference ONLY these IDs):
  timeline: exp_acme_2021 ("Senior Backend Engineer, Acme")
  cards:    proj_k8s_migration ("Monolith → K8s migration")
  tools:    skill_docker, skill_k8s, skill_postgres

Rules:
- Reference at most 4 IDs in total.
- If nothing is relevant, return "ui": [].
- Never invent an ID that is not listed above.
```

## Server-side validation — mandatory

Constraining the prompt is not enough. After parsing:

```ts
const valid = actions
  .filter(a => KNOWN_ACTIONS.has(a.action))
  .map(a => ({ ...a, ids: (a.ids ?? [a.id]).filter(id => entityMap.has(id)) }))
  .filter(a => a.action === 'reset_view' || a.ids.length > 0);
```

Log the drop rate. A sudden rise is the earliest signal that a prompt change broke retrieval.

## Frontend registry

```ts
const registry: Record<string, (ids: string[]) => void> = {
  focus_timeline:  ids => { timeline.dimAll(); ids.forEach(timeline.pulse);
                            timeline.scrollTo(ids[0]); },
  show_cards:      ids => ids.forEach((id, i) =>
                            setTimeout(() => cards.reveal(id), i * 120)),
  highlight_tools: ids => toolGrid.spotlight(ids),
  show_code:       ids => codePanel.open(ids[0]),
  show_metric:     ids => metrics.animate(ids[0]),
  open_link:       ids => cta.reveal(ids[0]),
  reset_view:      ()  => ui.resetAll(),
};

es.addEventListener('ui', e => {
  const a = JSON.parse(e.data);
  registry[a.action]?.(a.ids ?? [a.id]);   // unknown → silently ignored
});
```

**Always dispatch `reset_view` client-side when a new question is submitted**, before any new actions arrive. Without it, highlights accumulate into visual mud after three or four turns.

## Accessibility

Every action changes visible content, so announce it: wrap the card panel in `aria-live="polite"`, and respect `prefers-reduced-motion` by skipping the stagger and pulse animations (reveal instantly instead).
