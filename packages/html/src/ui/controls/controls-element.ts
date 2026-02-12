import { ControlsCore, ControlsDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectControls } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class ControlsElement extends MediaElement {
  static readonly tagName = 'media-controls';

  readonly #core = new ControlsCore();
  readonly #state = new PlayerController(this, playerContext, selectControls);

  override connectedCallback(): void {
    super.connectedCallback();

    if (__DEV__ && !this.#state.value) {
      logMissingFeature(ControlsElement.tagName, 'controls');
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const controls = this.#state.value;

    if (!controls) {
      return;
    }

    applyStateDataAttrs(this, this.#core.getState(controls), ControlsDataAttrs);
  }
}
