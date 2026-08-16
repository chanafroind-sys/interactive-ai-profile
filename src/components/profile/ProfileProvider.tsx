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
  revealedCards: string[];
  spotlitTools: Set<string>;
  openSnippet: string | null;
  animatingMetric: string | null;
  revealedLinks: Set<string>;
  prefersReducedMotion: boolean;
  dispatch: (action: RawUiAction) => void;
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
  const [revealedCards, setRevealedCards] = useState<string[]>(defaultCards);
  const [spotlitTools, setSpotlitTools] = useState<Set<string>>(new Set());
  const [openSnippet, setOpenSnippet] = useState<string | null>(null);
  const [animatingMetric, setAnimatingMetric] = useState<string | null>(null);
  const [revealedLinks, setRevealedLinks] = useState<Set<string>>(new Set());

  const registerNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodeRegistry.current.set(id, el);
    else nodeRegistry.current.delete(id);
  }, []);

  const toggleSnippet = useCallback((id: string) => {
    setOpenSnippet((prev) => (prev === id ? null : id));
  }, []);

  const resetView = useCallback(() => {
    setFocusedTimeline(new Set());
    setRevealedCards(defaultCards);
    setSpotlitTools(new Set());
    setOpenSnippet(null);
    setAnimatingMetric(null);
    setRevealedLinks(new Set());
  }, [defaultCards]);

  const dispatch = useCallback(
    (action: RawUiAction) => {
      if (!KNOWN_ACTIONS.has(action.action)) return;

      if (action.action === 'reset_view') {
        resetView();
        return;
      }

      // Centralised validation: an ID that isn't in this profile's real
      // entity map never reaches component state, so a bad ID is a silent
      // no-op everywhere, not just wherever a component happens to check.
      const ids = (action.ids ?? (action.id ? [action.id] : [])).filter((id) => entityMap.has(id));
      if (ids.length === 0) return;

      switch (action.action) {
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
              setRevealedCards((prev) => (prev.includes(id) ? prev : [...prev, id]));
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
    spotlitTools,
    openSnippet,
    animatingMetric,
    revealedLinks,
    prefersReducedMotion,
    dispatch,
    resetView,
    toggleSnippet,
    registerNode,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
