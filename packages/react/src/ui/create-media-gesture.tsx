'use client';

import type { GestureCore } from '@videojs/core';
import { bindGesture, type GesturePointerType, logMissingFeature } from '@videojs/core/dom';
import type { Selector } from '@videojs/store';
import { useEffect, useState } from 'react';

import { useMediaContainer, usePlayer } from '../player/context';

interface MediaGestureConfig<Core extends GestureCore> {
  displayName: string;
  core: { new (): Core };
  eventType: string;
  selector: Selector<object, object | undefined>;
}

export interface MediaGestureProps {
  type?: GesturePointerType;
}

/** Creates a media gesture React component from a core class and config. */
export function createMediaGesture<Core extends GestureCore, Props extends MediaGestureProps>(
  config: MediaGestureConfig<Core>
): (props: Props) => null {
  const { displayName, core: CoreClass, eventType, selector } = config;

  function MediaGesture({ type = 'mouse' }: MediaGestureProps) {
    const [core] = useState(() => new CoreClass());

    const playback = usePlayer(selector);
    if (playback) core.setMedia(playback as any);
    else {
      if (__DEV__) logMissingFeature(displayName, 'playback');
    }

    const container = useMediaContainer();

    useEffect(() => {
      if (!container) return;

      return bindGesture({
        container,
        eventType,
        core,
        pointerType: type,
      });
    }, [container, core, type]);

    return null;
  }

  if (__DEV__) MediaGesture.displayName = displayName;

  return MediaGesture as unknown as (props: Props) => null;
}
