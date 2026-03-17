import type { GestureCore } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../player/context';
import { PlayerController } from '../player/player-controller';
import { MediaElement } from '../ui/media-element';

/** Abstract base for HTML custom elements that represent a media gesture. */
export abstract class MediaGestureElement<Core extends GestureCore> extends MediaElement {
  protected abstract readonly core: Core;
  protected abstract readonly eventType: string;

  readonly #player = new PlayerController(this, playerContext);
  readonly #mediaState = new PlayerController(this, playerContext, selectPlayback);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.style.display = 'contents';

    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;

    const container = this.#player.value?.target?.container;

    if (container) {
      container.addEventListener(
        this.eventType,
        (event: Event) => {
          const target = event.target as Element;
          if (target !== container && !target.localName.endsWith('video')) return;

          this.core.handleGesture(event as PointerEvent);
        },
        { signal }
      );
    }

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update?.(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.core.setMedia(media);
    this.core.setProps(this);
  }
}
