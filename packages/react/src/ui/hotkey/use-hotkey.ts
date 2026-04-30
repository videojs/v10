'use client';

import { createHotkey } from '@videojs/core/dom';
import { useEffect } from 'react';

import { useContainer } from '../../player/context';
import { useLatestRef } from '../../utils/use-latest-ref';

export interface UseHotkeyOptions {
  keys: string;
  onActivate: (event: KeyboardEvent, key: string) => void;
  target?: 'player' | 'document';
  repeatable?: boolean;
  disabled?: boolean;
}

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
  }, [container, keys, target, repeatable, disabled]);
}
