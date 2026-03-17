'use client';

import { PlayGestureCore } from '@videojs/core';
import { selectPlayback } from '@videojs/core/dom';

import { createMediaGesture, type MediaGestureProps } from '../create-media-gesture';

export interface PlayGestureProps extends MediaGestureProps {}

export const PlayGesture = createMediaGesture<PlayGestureCore, PlayGestureProps>({
  displayName: 'PlayGesture',
  core: PlayGestureCore,
  eventType: 'pointerup',
  selector: selectPlayback,
});

export namespace PlayGesture {
  export type Props = PlayGestureProps;
}
