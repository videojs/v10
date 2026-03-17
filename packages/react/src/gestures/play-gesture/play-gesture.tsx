'use client';

import { type GesturePointerType, PlayGestureCore } from '@videojs/core';
import { selectPlayback } from '@videojs/core/dom';

import { createMediaGesture } from '../create-media-gesture';

export interface PlayGestureProps {
  type?: GesturePointerType;
}

export const PlayGesture = createMediaGesture<PlayGestureCore, PlayGestureProps>({
  displayName: 'PlayGesture',
  core: PlayGestureCore,
  eventType: 'pointerup',
  selector: selectPlayback,
});

export namespace PlayGesture {
  export type Props = PlayGestureProps;
}
