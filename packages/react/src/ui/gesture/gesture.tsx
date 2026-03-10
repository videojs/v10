'use client';

import { ALLOWED_GESTURE_TYPES, GestureCore } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { HTMLAttributes } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useMediaContainer, usePlayer } from '../../player/context';

export interface GestureProps extends HTMLAttributes<HTMLDivElement>, GestureCore.Props {}

export function Gesture({ type, command, ...props }: GestureProps) {
  const [gestureCore] = useState(() => new GestureCore());
  gestureCore.setProps({ type, command, ...props });

  const playback = usePlayer(selectPlayback);
  const container = useMediaContainer();

  const handleEvent = useCallback(
    (event: Event) => {
      const composedTarget = event.composedPath()?.[0] as Element | undefined;
      const allowList = ['video'];
      if (!composedTarget || !allowList.includes(composedTarget?.localName)) return;

      if (!playback) return;
      gestureCore.activate(playback);
    },
    [gestureCore, playback]
  );

  useEffect(() => {
    if (!ALLOWED_GESTURE_TYPES.includes(type)) return;

    const controller = new AbortController();

    if (!container) return;

    container.addEventListener(type, handleEvent, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [container, handleEvent, type]);

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
