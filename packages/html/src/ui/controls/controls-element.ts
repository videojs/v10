import { ControlsCore, ControlsDataAttrs } from '@videojs/core';
import {
  applyStateDataAttrs,
  type ControlsActivityApi,
  createControlsActivity,
  logMissingFeature,
  selectControls,
} from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';

import { containerContext, mediaContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { controlsContext } from './context';

export class ControlsElement extends MediaElement {
  static readonly tagName = 'media-controls';

  readonly #core = new ControlsCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectControls);
  readonly #provider = new ContextProvider(this, { context: controlsContext });
  readonly #container = new ContextConsumer(this, {
    context: containerContext,
    callback: () => this.#connectActivity(),
    subscribe: true,
  });
  readonly #media = new ContextConsumer(this, {
    context: mediaContext,
    callback: () => this.#connectActivity(),
    subscribe: true,
  });

  #activity: ControlsActivityApi | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }

    this.#connectActivity();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#activity?.destroy();
    this.#activity = null;
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
      stateAttrMap: ControlsDataAttrs,
    });
  }

  #connectActivity(): void {
    this.#activity?.destroy();
    this.#activity = null;

    const controls = this.#mediaState.value;
    const container = this.#container.value?.container;
    const media = this.#media.value?.media;
    if (!controls || !container || !media) return;

    this.#activity = createControlsActivity({
      getContainer: () => container as HTMLElement,
      getMedia: () => media,
      getControlsVisible: () => controls.controlsVisible,
      getUserActive: () => controls.userActive,
      setControls: (userActive, controlsVisible) => controls.setControls(userActive, controlsVisible),
    });
  }
}
