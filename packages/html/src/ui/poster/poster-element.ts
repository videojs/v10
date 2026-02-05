import type { PropertyValues } from '@lit/reactive-element';
import { PosterCore } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectPlayback } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class PosterElement extends MediaElement {
  static readonly tagName = 'media-poster';

  readonly #core = new PosterCore();
  readonly #state = new PlayerController(this, playerContext, selectPlayback);

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.#state.value) {
      logMissingFeature(PosterElement.tagName, 'playback');
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const state = this.#state.value;

    if (!state) {
      return;
    }

    applyStateDataAttrs(this, this.#core.getState(state));
  }
}
