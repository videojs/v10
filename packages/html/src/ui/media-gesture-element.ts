import type { GestureCore } from '@videojs/core';
import type { MediaContainer } from '@videojs/core/dom';
import { bindGesture, type GesturePointerType, logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { containerContext, playerContext } from '../player/context';
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

  readonly #mediaState = new PlayerController(this, playerContext, selectPlayback);

  constructor() {
    super();

    new ContextConsumer(this, {
      context: containerContext,
      callback: ({ container }) => this.#bindContainer(container),
      subscribe: true,
    });
  }

  #unbind: (() => void) | null = null;

  #bindContainer(container: MediaContainer | null): void {
    this.#unbind?.();
    this.#unbind = null;

    if (!container) return;

    this.#unbind = bindGesture({
      container,
      eventType: this.eventType,
      core: this.core,
      pointerType: this.type,
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';

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
