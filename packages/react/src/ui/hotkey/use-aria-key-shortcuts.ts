'use client';

import { findHotkeyCoordinator } from '@videojs/core/dom';
import { useMemo } from 'react';

import { useContainer } from '../../player/context';

/**
 * Resolve the registered hotkeys for an action into an `aria-keyshortcuts` value.
 *
 * @param action - Hotkey action name to look up.
 */
export function useAriaKeyShortcuts(action: string | undefined): string | undefined {
  const container = useContainer();
  return useMemo(() => {
    if (!container || !action) return undefined;
    return findHotkeyCoordinator(container)?.getAriaKeys(action);
  }, [container, action]);
}
