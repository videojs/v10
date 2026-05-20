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

/** Props for the Hotkey component. */
export interface HotkeyProps {
  /** Key combination(s) to bind. Supports ranges like `'0-9'`. */
  keys: string;
  /** Registered hotkey action name to dispatch when the keys fire. */
  action: HotkeyActionName | (string & {});
  /** Numeric value forwarded to the action handler (e.g. seek delta). */
  value?: number;
  /** Disables the hotkey without unmounting. */
  disabled?: boolean;
  /** Whether to listen on the player container or the document. */
  target?: 'player' | 'document';
}

/** Declaratively binds a keyboard shortcut on the player container or document. */
export function Hotkey({ keys, action, value, disabled, target }: HotkeyProps): ReactNode {
  const store = usePlayer() as AnyPlayerStore;
  const container = useContainer();

  useEffect(() => {
    if (!container || !keys || !action || disabled) return;

    const resolver = resolveHotkeyAction(action);
    if (!resolver) return;

    return createHotkey(container, {
      keys,
      action,
      value,
      target,
      disabled,
      repeatable: !isHotkeyToggleAction(action),
      onActivate: (_event, key) => {
        resolver({ store, key, value });
      },
    });
  }, [container, store, keys, action, value, disabled, target]);

  return null;
}

export namespace Hotkey {
  export type Props = HotkeyProps;
}

/** @deprecated Use `HotkeyProps` instead. */
export type MediaHotkeyProps = HotkeyProps;

/** @deprecated Use `Hotkey` instead. */
export const MediaHotkey = Hotkey;
