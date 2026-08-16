'use client';

import { useCallback, useState } from 'react';
import { useProfile, type RawUiAction } from '@/components/profile/ProfileProvider';
import type { ProfileJSON } from '@/types/profile';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ExperienceMeta {
  company?: string;
  tech?: string[];
}

/**
 * Canned {reply, ui[]} keyed off whatever this profile actually has, so the
 * mock works for any tenant, not just the demo fixture. Task 05 replaces
 * this with the real SSE stream from /api/chat — same dispatch call site.
 */
function buildMockResponse(profile: ProfileJSON): { reply: string; ui: RawUiAction[] } {
  const experience = profile.entities.find((e) => e.kind === 'experience');
  const project = profile.entities.find((e) => e.kind === 'project');
  const experienceMeta = experience?.meta as ExperienceMeta | undefined;
  const techTitles = new Set((experienceMeta?.tech ?? []).map((t) => t.toLowerCase()));
  const skills = profile.entities.filter((e) => e.kind === 'skill' && techTitles.has(e.title.toLowerCase())).slice(0, 2);

  const ui: RawUiAction[] = [];
  if (experience) ui.push({ action: 'focus_timeline', ids: [experience.id] });
  if (skills.length > 0) ui.push({ action: 'highlight_tools', ids: skills.map((s) => s.id) });
  if (project) ui.push({ action: 'show_cards', ids: [project.id] });

  const reply = experience
    ? `Here's a bit about ${profile.display_name}'s work${experienceMeta?.company ? ` at ${experienceMeta.company}` : ''}${project ? ' — and a related project below.' : '.'}`
    : `${profile.display_name} hasn't added experience yet — try asking about their skills.`;

  return { reply, ui };
}

export function useProfileChat() {
  const { profile, dispatch } = useProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: trimmed }]);
      setIsTyping(true);
      dispatch({ action: 'reset_view' });

      window.setTimeout(() => {
        const { reply, ui } = buildMockResponse(profile);
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);
        setIsTyping(false);
        ui.forEach((action) => dispatch(action));
      }, 800);
    },
    [profile, dispatch]
  );

  return { messages, isTyping, sendMessage };
}
