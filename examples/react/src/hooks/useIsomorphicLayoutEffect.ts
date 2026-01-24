import { useEffect, useLayoutEffect } from 'react';

export const useIsomorphicLayoutEffect: typeof useLayoutEffect | typeof useEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
