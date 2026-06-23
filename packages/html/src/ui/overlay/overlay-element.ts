import { OverlayCore, OverlayDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, selectControls, selectError } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class OverlayElement extends MediaElement {
  static readonly tagName = 'media-overlay';

  readonly #core = new OverlayCore();
  readonly #controls = new PlayerController(this, playerContext, selectControls);
  readonly #error = new PlayerController(this, playerContext, selectError);

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    this.#core.setMedia({ controls: this.#controls.value, error: this.#error.value });
    applyStateDataAttrs(this, this.#core.getState(), OverlayDataAttrs);
  }
}
