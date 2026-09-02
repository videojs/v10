import { createHotkey } from '@videojs/core/dom';
import { useEffect } from 'react';

import { useContainer } from '../../player/context';
import { useCommittedRef } from '../../utils/use-committed-ref';

export interface UseHotkeyOptions {
  keys: string;
  onActivate: (event: KeyboardEvent, key: string) => void;
  target?: 'player' | 'document';
  repeatable?: boolean;
  disabled?: boolean;
}

/**
 * Registers a keyboard shortcut through the current player's hotkey coordinator.
 *
 * @param options - Shortcut keys, activation callback, scope, repeat behavior, and disabled state.
 */
export function useHotkey(options: UseHotkeyOptions): void {
  const { keys, target = 'player', repeatable = true, disabled = false } = options;
  const container = useContainer();
  const onActivateRef = useCommittedRef(options.onActivate);

  useEffect(() => {
    if (!container || !keys || disabled) return;

    return createHotkey(container, {
      keys,
      target,
      repeatable,
      disabled,
      onActivate: (event, key) => onActivateRef.current(event, key),
    });
  }, [container, keys, target, repeatable, disabled]);
}
