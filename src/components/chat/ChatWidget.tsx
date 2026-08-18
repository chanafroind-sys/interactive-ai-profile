'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useProfile } from '@/components/profile/ProfileProvider';
import { useProfileChat } from './useProfileChat';

const STARTER_QUESTIONS = [
  "What's your experience with Docker?",
  'Tell me about a recent project',
  'Are you available for work?',
  "What's your tech stack?",
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : '';
  return (first + second).toUpperCase();
}

/** Circular profile image, or a neon initials tile when there's no avatar. */
function AvatarFace({ src, name, size }: { src: string | null; name: string; size: number }) {
  if (src) {
    return (
      // Tenant-supplied, arbitrary-domain image — next/image's remote pattern
      // allowlist can't cover every customer's CDN.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={size} height={size} className="h-full w-full rounded-full object-cover" />
    );
  }
  return (
    <span
      className="flex h-full w-full items-center justify-center rounded-full font-bold tracking-wide"
      style={{
        fontSize: size * 0.36,
        background: 'radial-gradient(circle at 32% 28%, oklch(0.32 0.09 250), oklch(0.19 0.05 255))',
        color: 'var(--neon-cyan)',
        textShadow: '0 0 12px color-mix(in oklch, var(--neon-cyan) 70%, transparent)',
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function ChatWidget() {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { messages, isTyping, sendMessage } = useProfileChat();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const submit = (text: string) => {
    if (!text.trim()) return;
    sendMessage(text);
    setDraft('');
    setOpen(true);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-[min(92vw,26rem)] overflow-hidden rounded-2xl border backdrop-blur-xl"
            style={{
              borderColor: 'color-mix(in oklch, var(--neon-cyan) 42%, transparent)',
              background: 'oklch(0.16 0.04 255 / 0.92)',
              boxShadow: '0 0 46px color-mix(in oklch, var(--neon-cyan) 26%, transparent)',
            }}
          >
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{ borderColor: 'color-mix(in oklch, var(--neon-cyan) 24%, transparent)' }}
            >
              <span
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2"
                style={{ color: 'var(--neon-cyan)' }}
              >
                <AvatarFace src={profile.avatar_url} name={profile.display_name} size={36} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-cyber-text">{profile.display_name}</p>
                <p className="truncate text-[11px] text-cyber-muted">AI assistant · ask me anything</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-md px-2 py-1 text-cyber-muted transition-colors hover:text-cyber-text"
              >
                ✕
              </button>
            </div>

            <div ref={listRef} aria-live="polite" className="flex h-[46vh] max-h-80 flex-col gap-3 overflow-y-auto p-4">
              {messages.length === 0 && !isTyping && (
                <div className="flex flex-wrap gap-2">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => submit(q)}
                      className="rounded-full border px-3 py-1.5 text-left text-sm transition-colors"
                      style={{ borderColor: 'color-mix(in oklch, var(--neon-blue) 35%, transparent)' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m) => (
                <p
                  key={m.id}
                  className={
                    m.role === 'user'
                      ? 'ml-auto max-w-[80%] rounded-2xl bg-[var(--accent)] px-3 py-2 text-sm text-white'
                      : 'mr-auto max-w-[80%] rounded-2xl px-3 py-2 text-sm'
                  }
                  style={
                    m.role === 'assistant'
                      ? { background: 'oklch(0.22 0.05 250 / 0.85)', color: 'var(--cyber-text)' }
                      : undefined
                  }
                >
                  {m.content}
                </p>
              ))}
              {isTyping && (
                <p
                  className="mr-auto flex gap-1 rounded-2xl px-3 py-2 text-sm"
                  style={{ background: 'oklch(0.22 0.05 250 / 0.85)', color: 'var(--cyber-muted)' }}
                  aria-label="Assistant is typing"
                >
                  <span className="motion-safe:animate-bounce">•</span>
                  <span className="motion-safe:animate-bounce [animation-delay:150ms]">•</span>
                  <span className="motion-safe:animate-bounce [animation-delay:300ms]">•</span>
                </p>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
              className="flex items-center gap-2 border-t p-3"
              style={{ borderColor: 'color-mix(in oklch, var(--neon-cyan) 24%, transparent)' }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about my experience…"
                aria-label="Ask a question"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-cyber-muted"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <AnimatePresence>
          {!open && (
            <motion.span
              key="prompt"
              initial={{ opacity: 0, x: 12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.9 }}
              className="relative select-none rounded-2xl border px-3.5 py-2 text-sm font-medium backdrop-blur-md"
              style={{
                borderColor: 'color-mix(in oklch, var(--neon-cyan) 45%, transparent)',
                background: 'oklch(0.18 0.05 250 / 0.8)',
                color: 'var(--cyber-text)',
                boxShadow: '0 0 22px color-mix(in oklch, var(--neon-cyan) 28%, transparent)',
              }}
            >
              Talk with me!
              {/* little tail pointing at the avatar */}
              <span
                aria-hidden
                className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-r border-t"
                style={{
                  borderColor: 'color-mix(in oklch, var(--neon-cyan) 45%, transparent)',
                  background: 'oklch(0.18 0.05 250 / 0.8)',
                }}
              />
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Collapse chat' : `Chat with ${profile.display_name}`}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="relative h-16 w-16 shrink-0 rounded-full"
        >
          {/* Rotating neon halo */}
          <motion.span
            aria-hidden
            className="absolute inset-[-6px] rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, var(--neon-cyan), var(--neon-blue), var(--neon-purple), var(--neon-cyan))',
              filter: 'blur(7px)',
              opacity: 0.75,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          />
          <span
            className="absolute inset-0 overflow-hidden rounded-full border-2"
            style={{
              borderColor: 'color-mix(in oklch, var(--neon-cyan) 80%, transparent)',
              background: 'oklch(0.16 0.04 255)',
            }}
          >
            <AvatarFace src={profile.avatar_url} name={profile.display_name} size={64} />
          </span>
          {/* Online dot */}
          <span
            aria-hidden
            className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2"
            style={{
              background: 'oklch(0.8 0.16 150)',
              borderColor: 'oklch(0.16 0.04 255)',
              boxShadow: '0 0 10px oklch(0.8 0.16 150)',
            }}
          />
        </motion.button>
      </div>
    </div>
  );
}
