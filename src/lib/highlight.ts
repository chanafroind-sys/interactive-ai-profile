import 'server-only';
import { createHighlighter, createJavaScriptRegexEngine, isSpecialLang } from 'shiki';
import type { Entity } from '@/types/profile';

// The JS regex engine (not the default WASM/oniguruma one) is shiki's own
// recommendation for edge runtimes like Cloudflare Workers — no .wasm to
// load, smaller bundle. Highlighting only ever runs here, at render time on
// the server (ISR regeneration), never in the browser.
const engine = createJavaScriptRegexEngine();

interface SnippetMeta {
  lang?: string;
}

export async function highlightSnippets(entities: Entity[]): Promise<Record<string, string>> {
  const snippets = entities.filter((e) => e.kind === 'snippet');
  if (snippets.length === 0) return {};

  const requestedLangs = Array.from(new Set(snippets.map((e) => (e.meta as SnippetMeta).lang ?? 'text')));
  const langsToLoad = requestedLangs.filter((lang) => !isSpecialLang(lang));

  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: langsToLoad,
    engine,
  });

  const html: Record<string, string> = {};
  for (const entity of snippets) {
    const lang = (entity.meta as SnippetMeta).lang ?? 'text';
    html[entity.id] = highlighter.codeToHtml(entity.body, {
      lang,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    });
  }
  return html;
}
