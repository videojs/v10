'use client';

import { ALLOWED_TYPES, GestureCore } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { HTMLAttributes } from 'react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import { useComposedRefs } from '../../utils/use-composed-refs';

export interface GestureProps extends HTMLAttributes<HTMLDivElement>, GestureCore.Props {}

export const Gesture = forwardRef<HTMLDivElement, GestureProps>(function Gesture({ type, command, ...props }, ref) {
  const internalRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, internalRef);

  const [gestureCore] = useState(() => new GestureCore());
  gestureCore.setProps({ type, command, ...props });

  const playback = usePlayer(selectPlayback);

  useEffect(() => {
    const el = internalRef.current;
    const parent = el?.parentElement;
    if (!parent) return;
    if (!ALLOWED_TYPES.includes(type)) return;

    const controller = new AbortController();

    parent.addEventListener(
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

    return () => controller.abort();
  }, [playback, gestureCore, type]);

  if (!playback) {
    if (__DEV__) logMissingFeature('Poster', 'playback');
    return null;
  }

  return <div ref={composedRef} style={{ display: 'contents' }} {...props} />;
});

if (__DEV__) Gesture.displayName = 'Gesture';

export namespace Gesture {
  export type Props = GestureProps;
}
