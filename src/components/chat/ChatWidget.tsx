'use client';

import { useEffect, useRef, useState } from 'react';
import { useProfileChat } from './useProfileChat';

const STARTER_QUESTIONS = [
  "What's your experience with Docker?",
  'Tell me about a recent project',
  'Are you available for work?',
  "What's your tech stack?",
];

export function ChatWidget() {
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
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div className="w-full max-w-lg rounded-2xl border border-foreground/10 bg-background shadow-2xl">
        {open && (
          <div ref={listRef} aria-live="polite" className="flex h-[60vh] max-h-[420px] flex-col gap-3 overflow-y-auto p-4">
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-wrap gap-2">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => submit(q)}
                    className="rounded-full border border-foreground/15 px-3 py-1.5 text-left text-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
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
                    : 'mr-auto max-w-[80%] rounded-2xl bg-foreground/5 px-3 py-2 text-sm'
                }
              >
                {m.content}
              </p>
            ))}
            {isTyping && (
              <p className="mr-auto flex gap-1 rounded-2xl bg-foreground/5 px-3 py-2 text-sm text-foreground/50" aria-label="Assistant is typing">
                <span className="motion-safe:animate-bounce">•</span>
                <span className="motion-safe:animate-bounce [animation-delay:150ms]">•</span>
                <span className="motion-safe:animate-bounce [animation-delay:300ms]">•</span>
              </p>
            )}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
          className="flex items-center gap-2 border-t border-foreground/10 p-3"
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Collapse chat' : 'Expand chat'}
            className="shrink-0 text-foreground/60"
          >
            {open ? '▾' : '▴'}
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Ask about my experience…"
            aria-label="Ask a question"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/40"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
