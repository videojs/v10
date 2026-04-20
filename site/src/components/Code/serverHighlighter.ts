import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import ts from 'shiki/langs/typescript.mjs';
import createHighlighter from './createHighlighter';

// The highlighter is a long-lived singleton at module scope; it is never
// disposed, so every grammar and theme we hand it stays in memory for the
// process lifetime. Only pre-load the languages `<ServerCode>` actually
// renders — adding `bundledLanguages` here would drag ~300 grammars into the
// build and dominate first-render cost on code-heavy pages.
const serverHighlighter = await createHighlighter({
  langs: [bash, css, html, javascript, ts, tsx],
});

export default serverHighlighter;
