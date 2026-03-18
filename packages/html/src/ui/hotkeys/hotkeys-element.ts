import { HotkeysCore } from '@videojs/core';
import { bindHotKeys } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class HotkeysElement extends MediaElement {
  static readonly tagName = 'media-hotkeys';

  readonly #core = new HotkeysCore();
  readonly #player = new PlayerController(this, playerContext);

  #unbind: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.style.display = 'contents';

    this.#unbind?.();

    const store = this.#player.value;
    const container = store?.target?.container;

    if (container) {
      this.#core.setMedia(store);
      this.#unbind = bindHotKeys({ container, core: this.#core });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unbind?.();
    this.#unbind = null;
    this.#core.setMedia(null);
  }
}
