'use client';

import { ALLOWED_GESTURE_TYPES, GestureCore } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { HTMLAttributes } from 'react';
import { useEffect, useState } from 'react';
import { useMediaContainer, usePlayer } from '../../player/context';

export interface GestureProps extends HTMLAttributes<HTMLDivElement>, GestureCore.Props {}

export function Gesture({ type, command }: GestureProps) {
  const [gestureCore] = useState(() => new GestureCore());
  gestureCore.setProps({ type, command });

  const playback = usePlayer(selectPlayback);
  if (playback) gestureCore.setMedia(playback);
  else {
    if (__DEV__) logMissingFeature('Gesture', 'playback');
  }

  const container = useMediaContainer();

  useEffect(() => {
    if (!ALLOWED_GESTURE_TYPES.includes(type)) return;
    if (!container) return;

    const controller = new AbortController();

    container.addEventListener(
      type,
      (event: PointerEvent) => {
        const target = event.target as Element;
        if (target !== container && !target.localName.endsWith('video')) return;

        gestureCore.handleGesture(event);
      },
      { signal: controller.signal }
    );

    return () => {
      controller.abort();
    };
  }, [container, type, gestureCore]);

  return null;
}

if (__DEV__) Gesture.displayName = 'Gesture';

export namespace Gesture {
  export type Props = GestureProps;
}
