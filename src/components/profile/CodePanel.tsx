'use client';

import { useProfile } from './ProfileProvider';

export function CodePanel() {
  const { profile, snippetHtml, openSnippet, toggleSnippet } = useProfile();
  const snippets = profile.entities.filter((e) => e.kind === 'snippet');
  if (snippets.length === 0) return null;

  return (
    <section aria-labelledby="code-heading" className="py-8">
      <h2 id="code-heading" className="mb-4 text-xl font-semibold">
        Code
      </h2>
      <div className="flex flex-col gap-3">
        {snippets.map((entity) => {
          const isOpen = openSnippet === entity.id;
          return (
            <div key={entity.id} data-entity-id={entity.id} data-state={isOpen ? 'open' : 'closed'} className="overflow-hidden rounded-xl border border-foreground/10">
              <button
                type="button"
                onClick={() => toggleSnippet(entity.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
              >
                {entity.title}
                <span aria-hidden="true" className="text-foreground/50">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div
                  className="max-w-full overflow-x-auto border-t border-foreground/10 px-4 py-3 text-sm [&_pre]:!bg-transparent [&_pre]:!m-0"
                  // Highlighted server-side with shiki (page.tsx) — never in the browser.
                  dangerouslySetInnerHTML={{ __html: snippetHtml[entity.id] ?? `<pre><code>${entity.body}</code></pre>` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
