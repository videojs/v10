'use client';

import {
  type AnyPlayerStore,
  createHotkey,
  type HotkeyActionName,
  isHotkeyToggleAction,
  resolveHotkeyAction,
} from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useContainer, usePlayer } from '../../player/context';

export interface MediaHotkeyProps {
  keys: string;
  action: HotkeyActionName | (string & {});
  value?: number;
  disabled?: boolean;
  target?: 'player' | 'document';
}

export function MediaHotkey({ keys, action, value, disabled, target }: MediaHotkeyProps): ReactNode {
  const store = usePlayer() as AnyPlayerStore;
  const container = useContainer();

  useEffect(() => {
    if (!container || !keys || !action || disabled) return;

    const resolver = resolveHotkeyAction(action);
    if (!resolver) return;

    return createHotkey(container, {
      keys,
      action,
      target,
      disabled,
      repeatable: !isHotkeyToggleAction(action),
      onActivate: (_event, key) => resolver({ store, key, value }),
    });
  }, [container, store, keys, action, value, disabled, target]);

  return null;
}
