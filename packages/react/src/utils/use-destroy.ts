'use client';

import { useEffect, useRef } from 'react';

interface Destroyable {
  destroy(): void;
}

/**
 * Destroy an instance on unmount, deferring destruction to survive React
 * StrictMode's simulated unmount/re-mount cycle.
 *
 * StrictMode runs effects, then immediately runs cleanup, then re-runs
 * effects — all synchronously. By deferring `destroy()` to a macrotask,
 * the re-mount effect can cancel it before it fires.
 *
 * @param instance - Object with a `destroy()` method.
 * @param setup - Optional setup called on first mount. Skipped on StrictMode
 *   re-mount since the previous setup was never torn down.
 */
export function useDestroy(instance: Destroyable, setup?: () => void): void {
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pendingRef.current !== null) {
      clearTimeout(pendingRef.current);
      pendingRef.current = null;
    } else {
      setup?.();
    }

    return () => {
      pendingRef.current = setTimeout(() => instance.destroy(), 0);
    };
  }, [instance, setup]);
}
