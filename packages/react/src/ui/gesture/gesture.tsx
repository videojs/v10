'use client';

import { ALLOWED_GESTURE_TYPES, GestureCore } from '@videojs/core';
import { logMissingFeature, type PlayerTarget, selectPlayback } from '@videojs/core/dom';
import type { HTMLAttributes } from 'react';
import { useEffect, useState } from 'react';
import { usePlayer, usePlayerContext } from '../../player/context';

export interface GestureProps extends HTMLAttributes<HTMLDivElement>, GestureCore.Props {}

export function Gesture({ type, command, ...props }: GestureProps) {
  const [gestureCore] = useState(() => new GestureCore());
  gestureCore.setProps({ type, command, ...props });

  const { store } = usePlayerContext();
  const playback = usePlayer(selectPlayback);

  useEffect(() => {
    if (!ALLOWED_GESTURE_TYPES.includes(type)) return;

    const controller = new AbortController();

    const attach = () => {
      controller.abort();

      const container = (store.target as PlayerTarget | null)?.container;
      if (!container) return;

      container.addEventListener(
        type,
        (event) => {
          const composedTarget = event.composedPath()?.[0] as Element | undefined;
          const allowList = ['video'];
          if (!composedTarget || !allowList.includes(composedTarget?.localName)) return;

          if (!playback) return;
          gestureCore.activate(playback);
        },
        { signal: controller.signal }
      );
    };

    attach();

    const unsubscribe = store.subscribe(attach);

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [store, playback, gestureCore, type]);

  if (!playback) {
    if (__DEV__) logMissingFeature('Gesture', 'playback');
    return null;
  }

  return null;
}

if (__DEV__) Gesture.displayName = 'Gesture';

export namespace Gesture {
  export type Props = GestureProps;
}
