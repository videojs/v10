import { type GesturePointerType, PlayGestureCore } from '@videojs/core';
import type { PropertyDeclarationMap } from '@videojs/element';

import { MediaGestureElement } from '../media-gesture-element';

export class PlayGestureElement extends MediaGestureElement<PlayGestureCore> {
  static readonly tagName = 'media-play-gesture';

  static override properties: PropertyDeclarationMap = {
    type: { type: String },
  };

  type: GesturePointerType = PlayGestureCore.defaultProps.type;

  protected readonly core = new PlayGestureCore();
  protected readonly eventType = 'pointerup';
}
