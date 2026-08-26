import { ContainerCore, ContainerDataAttrs } from '@videojs/core';
import {
  applyContainerAttrs,
  applyStateDataAttrs,
  createPopupGroup,
  focusContainer,
  type MediaContainer,
  selectControls,
} from '@videojs/core/dom';
import { labelText } from '@videojs/core/i18n/text/container';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';
import { listen } from '@videojs/utils/dom';

import { i18nContext } from '../../i18n/context';
import { I18nController } from '../../i18n/controller';
import { type ContainerContextValue, containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { popupGroupContext } from '../../player/popup-group-context';
import { UIElement } from '../ui-element';

/**
 * The visual, interactive player boundary.
 *
 * A container registers itself with its closest player and provides popup coordination to the controls it contains.
 */
export class ContainerElement extends UIElement implements MediaContainer {
  static readonly tagName = 'media-container';

  #releaseContainer: (() => void) | null = null;
  #disconnect: AbortController | null = null;
  #label: string | null = null;

  readonly #core = new ContainerCore();
  readonly #controls = new PlayerController(this, playerContext, selectControls);
  readonly #i18n = new I18nController(this, i18nContext);
  readonly #popupGroup = createPopupGroup();
  readonly #popupGroupProvider = new ContextProvider(this, {
    context: popupGroupContext,
    initialValue: this.#popupGroup,
  });
  readonly #container = new ContextConsumer(this, {
    context: containerContext,
    callback: (value) => this.#register(value),
  });

  override connectedCallback(): void {
    super.connectedCallback();

    this.#popupGroupProvider.setValue(this.#popupGroup);
    this.#register(this.#container.value);
    applyContainerAttrs(this);
    this.#applyLabel();

    this.#disconnect = new AbortController();
    listen(this, 'pointerup', this.#onPointerUp, { signal: this.#disconnect.signal });
  }

  override disconnectedCallback(): void {
    this.#releaseContainer?.();
    this.#releaseContainer = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
    super.disconnectedCallback();
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    this.#applyLabel();

    const controls = this.#controls.value;

    if (controls) {
      this.#core.setMedia(controls);
      applyStateDataAttrs(this, this.#core.getState(), ContainerDataAttrs);
    } else {
      this.removeAttribute(ContainerDataAttrs.controlsVisible);
    }
  }

  #register(value: ContainerContextValue | undefined): void {
    this.#releaseContainer?.();
    this.#releaseContainer = null;

    if (this.isConnected && value) {
      this.#releaseContainer = value.registerContainer(this);
    }
  }

  #applyLabel(): void {
    const current = this.getAttribute('aria-label');
    if (current && current !== this.#label) return;

    if (this.hasAttribute('aria-labelledby')) {
      if (current === this.#label) {
        this.removeAttribute('aria-label');
        this.#label = null;
      }

      return;
    }

    const label = this.#i18n.value(labelText);

    this.setAttribute('aria-label', label);
    this.#label = label;
  }

  #onPointerUp = (): void => {
    focusContainer(this);
  };
}
