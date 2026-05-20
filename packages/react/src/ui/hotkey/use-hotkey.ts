'use client';

import { createHotkey } from '@videojs/core/dom';
import { useEffect } from 'react';

import { useContainer } from '../../player/context';
import { useLatestRef } from '../../utils/use-latest-ref';

/** Options for the `useHotkey` hook. */
export interface UseHotkeyOptions {
  /** Key combination(s) to bind. Supports ranges like `'0-9'`. */
  keys: string;
  /** Called when the keys fire, with the originating event and matched key. */
  onActivate: (event: KeyboardEvent, key: string) => void;
  /** Whether to listen on the player container or the document. */
  target?: 'player' | 'document';
  /** Whether the handler may fire on key auto-repeat. */
  repeatable?: boolean;
  /** Disables the hotkey without unmounting. */
  disabled?: boolean;
}

/**
 * Bind a custom keyboard shortcut to the player container or document.
 *
 * @param options - Hotkey configuration with key binding and activation handler.
 */
export function useHotkey(options: UseHotkeyOptions): void {
  const { keys, target = 'player', repeatable = true, disabled = false } = options;
  const container = useContainer();
  const onActivateRef = useLatestRef(options.onActivate);

  useEffect(() => {
    if (!container || !keys || disabled) return;

    return createHotkey(container, {
      keys,
      target,
      repeatable,
      disabled,
      onActivate: (event, key) => onActivateRef.current(event, key),
    });
  }, [container, keys, target, repeatable, disabled, onActivateRef]);
}
