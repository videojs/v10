import { type Highlighter, createHighlighter as libCreateHighlighter } from 'shiki';
import gruvboxDarkHard from 'shiki/themes/gruvbox-dark-hard.mjs';
import gruvboxDarkSoft from 'shiki/themes/gruvbox-dark-soft.mjs';

const SHIKI_CACHE_SYMBOL = Symbol.for('@videojs/site/shiki');

type ShikiCacheKey = 'server' | 'client';

interface ShikiGlobalCache {
  server?: Promise<Highlighter>;
  client?: Promise<Highlighter>;
}

function getShikiGlobalCache(): ShikiGlobalCache {
  const global = globalThis as typeof globalThis & {
    [SHIKI_CACHE_SYMBOL]?: ShikiGlobalCache;
  };
  global[SHIKI_CACHE_SYMBOL] ??= {};
  return global[SHIKI_CACHE_SYMBOL];
}

/** Reuse one highlighter per role across HMR module re-evaluations in dev. */
export function getOrCreateCachedHighlighter(
  key: ShikiCacheKey,
  factory: () => Promise<Highlighter>
): Promise<Highlighter> {
  const cache = getShikiGlobalCache();
  cache[key] ??= factory();
  return cache[key];
}

export default function createHighlighter(config: Omit<Parameters<typeof libCreateHighlighter>[0], 'themes'>) {
  return libCreateHighlighter({
    ...config,
    themes: [gruvboxDarkHard, gruvboxDarkSoft],
  });
}
