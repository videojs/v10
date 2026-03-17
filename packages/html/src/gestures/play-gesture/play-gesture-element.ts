import { PlayGestureCore } from '@videojs/core';

import { MediaGestureElement } from '../media-gesture-element';

export class PlayGestureElement extends MediaGestureElement<PlayGestureCore> {
  static readonly tagName = 'media-play-gesture';

  protected readonly core = new PlayGestureCore();
  protected readonly eventType = 'pointerup';
}
