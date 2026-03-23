import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import createHighlighter from './createHighlighter';

// Eager module-level Promise — deliberately NOT a top-level `await`.
//
// Top-level `await` causes Safari hydration errors when multiple React
// `client:idle` islands on the same Astro page import the same module.
// https://github.com/withastro/astro/issues/10055
//
// Storing the unresolved Promise keeps module evaluation synchronous,
// avoiding the bug. The Promise starts resolving at import time, giving
// it a head start before `client:idle` hydration kicks in.
// ClientCode.tsx consumes this via React 19's `use()` hook + Suspense.
const highlighterPromise = createHighlighter({ langs: [bash, html, tsx, css, javascript] });

export function getClientHighlighter() {
  return highlighterPromise;
}
