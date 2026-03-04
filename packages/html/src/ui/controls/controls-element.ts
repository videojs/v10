import { ControlsCore, ControlsDataAttrs, type StateAttrMap } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectControls } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { controlsContext } from './controls-context';

export class ControlsElement extends MediaElement {
  static readonly tagName = 'media-controls';

  readonly #core = new ControlsCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectControls);
  readonly #provider = new ContextProvider(this, { context: controlsContext });

  override connectedCallback(): void {
    super.connectedCallback();

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.#core.setMedia(media);
    const state = this.#core.getState();

    applyStateDataAttrs(this, state, ControlsDataAttrs);

    this.#provider.setValue({
      state,
      stateAttrMap: ControlsDataAttrs as StateAttrMap<object>,
    });
  }
}
