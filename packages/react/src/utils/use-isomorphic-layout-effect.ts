import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` that degrades to `useEffect` when no DOM is available.
 *
 * React 18 warns when `useLayoutEffect` runs during server rendering. Neither effect fires on the server, so swapping
 * in `useEffect` there keeps commit-phase writes silent under SSR while preserving layout timing in the browser.
 */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;
