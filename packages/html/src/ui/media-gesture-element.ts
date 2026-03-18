import type { GestureCore } from '@videojs/core';
import { bindGesture, type GesturePointerType, logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../player/context';
import { PlayerController } from '../player/player-controller';
import { MediaElement } from './media-element';

/** Abstract base for HTML custom elements that represent a media gesture. */
export abstract class MediaGestureElement<Core extends GestureCore> extends MediaElement {
  static override properties: PropertyDeclarationMap = {
    type: { type: String },
  };

  type: GesturePointerType = 'mouse';

  protected abstract readonly core: Core;
  protected abstract readonly eventType: string;

  readonly #player = new PlayerController(this, playerContext);
  readonly #mediaState = new PlayerController(this, playerContext, selectPlayback);

  #unbind: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.style.display = 'contents';

    this.#unbind?.();

    const container = this.#player.value?.target?.container;

    if (container) {
      this.#unbind = bindGesture({
        container,
        eventType: this.eventType,
        core: this.core,
        pointerType: this.type,
      });
    }

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unbind?.();
    this.#unbind = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update?.(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.core.setMedia(media);
  }
}
