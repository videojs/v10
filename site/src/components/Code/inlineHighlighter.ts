import { hastToHtml } from 'shiki';
import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';

import serverHighlighter from './serverHighlighter';

export type InlineLang = 'ts' | 'tsx' | 'css' | 'html' | 'bash';

// Inline chips are small and sit on the page background rather than in a dark frame, so they need a palette with more
// contrast than the gruvbox themes used for code blocks. Loading these onto the shared server highlighter keeps one
// grammar set in memory; `Shared` still requests the gruvbox themes by name, so block highlighting is unaffected.
await Promise.all([serverHighlighter.loadTheme(githubLight), serverHighlighter.loadTheme(githubDark)]);

const cache = new Map<string, string>();

/**
 * Highlight a short snippet as bare token spans, with no `pre`, `code`, or line wrappers.
 *
 * The spans carry both palettes as CSS variables; the `[data-code-inline]` rules in `shiki-transformers.css` pick the
 * light one by default and the dark one under `.dark`.
 */
export function highlightInline(code: string, lang: InlineLang = 'ts'): string {
  const cacheKey = `${lang}\0${code}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const hast = serverHighlighter.codeToHast(code, {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    // Emit only `--shiki-light` / `--shiki-dark` variables. An inline `color` would outrank the stylesheet swap in
    // `shiki-transformers.css`, leaving the light palette on in dark mode.
    defaultColor: false,
    structure: 'inline',
  });
  const html = hastToHtml(hast);

  cache.set(cacheKey, html);
  return html;
}

const ENTITIES = new Map([
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#39;', "'"],
  ['&#x27;', "'"],
  ['&amp;', '&'],
]);

function decodeEntities(text: string): string {
  return text.replace(/&(?:lt|gt|quot|amp|#39|#x27);/g, (entity) => ENTITIES.get(entity) ?? entity);
}

/**
 * Highlight the plain-text `<code>` chips inside already-rendered HTML.
 *
 * Table cells render their slot to HTML and pass it through here, so inline code in Markdown tables gets the same
 * treatment as API reference types without touching prose elsewhere. Chips that already carry markup or highlighting
 * are left alone.
 */
export function highlightInlineCodeHtml(html: string, lang: InlineLang = 'ts'): string {
  return html.replace(
    /<code class="([^"]*)">([^<]*)<\/code>/g,
    (_, className: string, text: string) =>
      `<code class="${className}" data-code-inline>${highlightInline(decodeEntities(text), lang)}</code>`
  );
}
