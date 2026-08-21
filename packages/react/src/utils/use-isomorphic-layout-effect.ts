import { useEffect, useLayoutEffect } from 'react';

/** Uses layout timing in the browser without warning during server rendering. */
export const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
