'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { Entity, ProfileJSON } from '@/types/profile';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

// Looser than `UiAction` on purpose: real actions arrive as parsed JSON from
// an LLM (Task 05) with no compile-time guarantee the action name or IDs are
// ones we know about. The registry below is what enforces the contract's
// "unknown actions/IDs are silently ignored" rule at runtime.
export interface RawUiAction {
  action: string;
  ids?: string[];
  id?: string;
}

/** Pull a validated ID list off an untrusted payload. Accepts both wire forms
 *  (`ids: string[]` and the scalar `id: string`), tolerates a bare string in
 *  either slot, and drops anything that isn't a string — the entity-map check
 *  in `dispatch` is what decides whether a surviving ID is real. */
function readIds(action: Record<string, unknown>): string[] {
  const raw = action.ids ?? action.id;
  if (typeof raw === 'string') return [raw];
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string');
}

const KNOWN_ACTIONS = new Set<string>([
  'focus_timeline',
  'show_cards',
  'highlight_tools',
  'show_code',
  'show_metric',
  'open_link',
  'reset_view',
]);

interface ProfileContextValue {
  profile: ProfileJSON;
  entityMap: Map<string, Entity>;
  snippetHtml: Record<string, string>;
  focusedTimeline: Set<string>;
  /** Everything the card panel should show: the default featured projects
   *  plus anything an action revealed. */
  revealedCards: string[];
  /** Only what a `show_cards` action revealed. Consumers that highlight on
   *  AI activity must use this — `revealedCards` is non-empty at rest, so
   *  keying a highlight off it leaves the default projects lit forever. */
  aiRevealedCards: string[];
  spotlitTools: Set<string>;
  openSnippet: string | null;
  animatingMetric: string | null;
  revealedLinks: Set<string>;
  prefersReducedMotion: boolean;
  /** Increments on every resetView, so components holding their own local
   *  interaction state (e.g. an open detail card) can clear it too. */
  resetSignal: number;
  /** Untyped on purpose: the real caller (Task 05) feeds this `JSON.parse`
   *  output straight off the wire, so every field is validated at runtime. */
  dispatch: (action: unknown) => void;
  resetView: () => void;
  toggleSnippet: (id: string) => void;
  /** Shared id → DOM node registry, used to scroll timeline nodes and metric tiles into view. */
  registerNode: (id: string, el: HTMLElement | null) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}

function defaultFeaturedCardIds(profile: ProfileJSON): string[] {
  return profile.entities
    .filter((e) => e.kind === 'project')
    .slice(0, 3)
    .map((e) => e.id);
}

export function ProfileProvider({
  profile,
  snippetHtml = {},
  children,
}: {
  profile: ProfileJSON;
  snippetHtml?: Record<string, string>;
  children: React.ReactNode;
}) {
  const entityMap = useMemo(() => new Map(profile.entities.map((e) => [e.id, e] as const)), [profile.entities]);
  const defaultCards = useMemo(() => defaultFeaturedCardIds(profile), [profile]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const nodeRegistry = useRef(new Map<string, HTMLElement>());

  const [focusedTimeline, setFocusedTimeline] = useState<Set<string>>(new Set());
  const [aiRevealedCards, setAiRevealedCards] = useState<string[]>([]);
  const [spotlitTools, setSpotlitTools] = useState<Set<string>>(new Set());
  const [openSnippet, setOpenSnippet] = useState<string | null>(null);
  const [animatingMetric, setAnimatingMetric] = useState<string | null>(null);
  const [revealedLinks, setRevealedLinks] = useState<Set<string>>(new Set());
  const [resetSignal, setResetSignal] = useState(0);

  // The panel shows the featured defaults plus whatever an action revealed;
  // the two are tracked separately so "revealed by the AI" stays meaningful.
  const revealedCards = useMemo(
    () => Array.from(new Set([...defaultCards, ...aiRevealedCards])),
    [defaultCards, aiRevealedCards]
  );

  const registerNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodeRegistry.current.set(id, el);
    else nodeRegistry.current.delete(id);
  }, []);

  const toggleSnippet = useCallback((id: string) => {
    setOpenSnippet((prev) => (prev === id ? null : id));
  }, []);

  const resetView = useCallback(() => {
    setFocusedTimeline(new Set());
    setAiRevealedCards([]);
    setSpotlitTools(new Set());
    setOpenSnippet(null);
    setAnimatingMetric(null);
    setRevealedLinks(new Set());
    setResetSignal((n) => n + 1);
  }, []);

  const dispatch = useCallback(
    (action: unknown) => {
      // Shape-check before touching any field. A malformed frame (`null`, a
      // bare string, `ids` sent as a scalar) has to be as silent a no-op as an
      // unknown action name — this runs inside an SSE listener in Task 05,
      // where a throw would tear down the handler and stall the whole stream.
      if (typeof action !== 'object' || action === null || Array.isArray(action)) return;
      const raw = action as Record<string, unknown>;
      const name = raw.action;
      if (typeof name !== 'string' || !KNOWN_ACTIONS.has(name)) return;

      if (name === 'reset_view') {
        resetView();
        return;
      }

      // Centralised validation: an ID that isn't in this profile's real
      // entity map never reaches component state, so a bad ID is a silent
      // no-op everywhere, not just wherever a component happens to check.
      const ids = readIds(raw).filter((id) => entityMap.has(id));
      if (ids.length === 0) return;

      switch (name) {
        case 'focus_timeline': {
          setFocusedTimeline(new Set(ids));
          const target = nodeRegistry.current.get(ids[0]!);
          target?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
          break;
        }
        case 'show_cards': {
          ids.forEach((id, i) => {
            const delay = prefersReducedMotion ? 0 : i * 120;
            setTimeout(() => {
              setAiRevealedCards((prev) => (prev.includes(id) ? prev : [...prev, id]));
            }, delay);
          });
          break;
        }
        case 'highlight_tools':
          setSpotlitTools(new Set(ids));
          break;
        case 'show_code':
          setOpenSnippet(ids[0]!);
          break;
        case 'show_metric': {
          setAnimatingMetric(ids[0]!);
          const target = nodeRegistry.current.get(ids[0]!);
          target?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
          break;
        }
        case 'open_link':
          setRevealedLinks((prev) => new Set(prev).add(ids[0]!));
          break;
      }
    },
    [entityMap, prefersReducedMotion, resetView]
  );

  const value: ProfileContextValue = {
    profile,
    entityMap,
    snippetHtml,
    focusedTimeline,
    revealedCards,
    aiRevealedCards,
    spotlitTools,
    openSnippet,
    animatingMetric,
    revealedLinks,
    prefersReducedMotion,
    resetSignal,
    dispatch,
    resetView,
    toggleSnippet,
    registerNode,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
