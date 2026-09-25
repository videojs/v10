import astro from 'shiki/langs/astro.mjs';
import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import json from 'shiki/langs/json.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import ts from 'shiki/langs/typescript.mjs';

import createHighlighter, { getOrCreateCachedHighlighter } from './createHighlighter';

// Module-level Promise — deliberately NOT a top-level `await`.
//
// Top-level `await` causes Safari hydration errors when multiple React
// `client:idle` islands on the same Astro page import the same module.
// https://github.com/withastro/astro/issues/10055
//
// Storing the unresolved Promise keeps module evaluation synchronous,
// avoiding the bug. ClientCode.tsx imports this module on demand.
const highlighterPromise = getOrCreateCachedHighlighter('client', () =>
  createHighlighter({ langs: [astro, bash, html, json, ts, tsx, css] })
);

export function getClientHighlighter() {
  return highlighterPromise;
}
