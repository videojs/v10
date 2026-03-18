import { HotkeysCore } from '@videojs/core';
import type { MediaContainer } from '@videojs/core/dom';
import { bindHotKeys } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class HotkeysElement extends MediaElement {
  static readonly tagName = 'media-hotkeys';

  readonly #core = new HotkeysCore();
  readonly #player = new PlayerController(this, playerContext);

  #unbind: (() => void) | null = null;

  constructor() {
    super();

    new ContextConsumer(this, {
      context: containerContext,
      callback: ({ container }) => this.#bindContainer(container),
      subscribe: true,
    });
  }

  #bindContainer(container: MediaContainer | null): void {
    this.#unbind?.();
    this.#unbind = null;

    if (!container) return;

    this.#unbind = bindHotKeys({ container, core: this.#core });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unbind?.();
    this.#unbind = null;
    this.#core.setMedia(null);
  }

  protected override update(changed: PropertyValues): void {
    super.update?.(changed);

    const media = this.#player.value;
    if (!media) return;

    this.#core.setMedia(media);
  }
}
