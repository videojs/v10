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

export function useHotkey(options: UseHotkeyOptions): void {
  const { keys, target = 'player', repeatable = true, disabled = false } = options;
  const container = useContainer();
  const onActivateRef = useCommittedRef(options.onActivate);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the retained listener reads the commit-published callback without rebinding
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
