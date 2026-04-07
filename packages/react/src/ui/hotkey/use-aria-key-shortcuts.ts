'use client';

import { findHotkeyCoordinator } from '@videojs/core/dom';
import { useMemo } from 'react';

import { useContainer } from '../../player/context';

export function useAriaKeyShortcuts(action: string | undefined): string | undefined {
  const container = useContainer();
  return useMemo(() => {
    if (!container || !action) return undefined;
    return findHotkeyCoordinator(container)?.getAriaKeys(action);
  }, [container, action]);
}
