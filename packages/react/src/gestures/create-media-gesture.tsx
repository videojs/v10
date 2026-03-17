'use client';

import type { GestureCore } from '@videojs/core';
import { logMissingFeature } from '@videojs/core/dom';
import type { Selector } from '@videojs/store';
import { useEffect, useState } from 'react';

import { useMediaContainer, usePlayer } from '../player/context';

interface MediaGestureConfig<Core extends GestureCore> {
  displayName: string;
  core: { new (): Core; defaultProps: object };
  eventType: string;
  selector: Selector<object, object | undefined>;
}

/** Creates a media gesture React component from a core class and config. */
export function createMediaGesture<Core extends GestureCore, Props extends object>(
  config: MediaGestureConfig<Core>
): (props: Props) => null {
  const { displayName, core: CoreClass, eventType, selector } = config;

  const corePropKeys = new Set(Object.keys(CoreClass.defaultProps as Record<string, unknown>));

  function MediaGesture(componentProps: Record<string, unknown>) {
    const coreProps: Record<string, unknown> = {};
    for (const key of Object.keys(componentProps)) {
      if (corePropKeys.has(key)) {
        coreProps[key] = componentProps[key];
      }
    }

    const [core] = useState(() => new CoreClass());
    core.setProps(coreProps);

    const playback = usePlayer(selector);
    if (playback) core.setMedia(playback as any);
    else {
      if (__DEV__) logMissingFeature(displayName, 'playback');
    }

    const container = useMediaContainer();

    useEffect(() => {
      if (!container) return;

      const controller = new AbortController();

      container.addEventListener(
        eventType,
        (event: Event) => {
          const target = event.target as Element;
          if (target !== container && !target.localName.endsWith('video')) return;

          core.handleGesture(event as PointerEvent);
        },
        { signal: controller.signal }
      );

      return () => {
        controller.abort();
      };
    }, [container, core]);

    return null;
  }

  if (__DEV__) MediaGesture.displayName = displayName;

  return MediaGesture as unknown as (props: Props) => null;
}
