import { applyContainerAttrs } from '@videojs/core/dom';
import { containsComposed, getDeepActiveElement, listen } from '@videojs/utils/dom';

import { containerContext, playerContext } from '../player/context';
import { createContainerMixin } from '../store/container-mixin';
import { MediaElement } from '../ui/media-element';

const ContainerMixin = createContainerMixin({ playerContext, containerContext });

export class MediaContainerElement extends ContainerMixin(MediaElement) {
  static readonly tagName = 'media-container';

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    applyContainerAttrs(this);

    this.#disconnect = new AbortController();
    listen(this, 'pointerup', this.#onPointerUp, { signal: this.#disconnect.signal });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  #onPointerUp = (): void => {
    const active = getDeepActiveElement(this.ownerDocument);

    // If nothing inside the container has focus, grab it so keyboard
    // events reach the hotkey coordinator's listener.
    if (!active || active === this.ownerDocument.body || !containsComposed(this, active)) {
      this.focus({ preventScroll: true });
    }
  };
}
