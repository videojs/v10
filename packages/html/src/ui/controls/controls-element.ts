import { ControlsCore, ControlsDataAttrs, POPUP_HOST_SELECTOR } from '@videojs/core';
import { applyStateDataAttrs, selectControls } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextEvent, ContextProvider } from '@videojs/element/context';
import { isFunction } from '@videojs/utils/predicate';

import { controlsContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { controlsContext as controlsStateContext } from './context';

export class ControlsElement extends MediaElement {
  static readonly tagName = 'media-controls';

  readonly #core = new ControlsCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectControls);
  readonly #provider = new ContextProvider(this, { context: controlsStateContext });
  #unsubscribeContext: (() => void) | null = null;
  #unregister: (() => void) | null = null;
  #registering = false;
  #visible = true;

  override connectedCallback(): void {
    super.connectedCallback();

    this.dispatchEvent(
      new ContextEvent(
        controlsContext,
        this,
        (value, unsubscribe) => {
          this.#unsubscribeContext ??= unsubscribe ?? null;
          if (!this.#unregister && !this.#registering) {
            this.#registering = true;
            try {
              this.#unregister = value?.register() ?? null;
            } finally {
              this.#registering = false;
            }
          }
        },
        true
      )
    );
  }

  override disconnectedCallback(): void {
    this.#registering = false;
    this.#unsubscribeContext?.();
    this.#unsubscribeContext = null;
    this.#unregister?.();
    this.#unregister = null;
    super.disconnectedCallback();
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

    const wasVisible = this.#visible;
    this.#visible = state.visible;

    if (wasVisible && !state.visible) {
      this.#closeOwnedOverlays();
    }
  }

  #closeOwnedOverlays(): void {
    for (const element of this.querySelectorAll(POPUP_HOST_SELECTOR)) {
      const host = element as Element & { close?: unknown };
      if (!isFunction(host.close)) continue;

      host.close('imperative-action');
    }
  }
}
