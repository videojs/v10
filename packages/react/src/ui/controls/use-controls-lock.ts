'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLatestRef } from '../../utils/use-latest-ref';
import { useOptionalControlsContext } from './context';

export interface ControlsLockHandle {
  lock: () => void;
  unlock: () => void;
}

/** Acquire and release a controls visibility lock from an interaction lifecycle. */
export function useControlsLock(): ControlsLockHandle {
  const controls = useOptionalControlsContext();
  const requestControlsLock = controls?.requestControlsLock;
  const requestLockRef = useLatestRef(requestControlsLock);
  const lockedRef = useRef(false);
  const releaseRef = useRef<(() => void) | null>(null);

  const unlock = useCallback(() => {
    if (!lockedRef.current) return;

    lockedRef.current = false;
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);

  const lock = useCallback(() => {
    if (lockedRef.current) return;

    lockedRef.current = true;
    releaseRef.current = requestLockRef.current?.() ?? null;
  }, []);

  useEffect(() => {
    if (!lockedRef.current) return;

    releaseRef.current?.();
    releaseRef.current = requestControlsLock?.() ?? null;
  }, [requestControlsLock]);

  useEffect(() => unlock, [unlock]);

  return useMemo(() => ({ lock, unlock }), [lock, unlock]);
}
