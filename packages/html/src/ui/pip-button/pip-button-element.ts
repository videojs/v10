import { PipButtonCore, PipButtonDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, createButton, logMissingFeature, selectPiP } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class PipButtonElement extends MediaElement {
  static readonly tagName = 'media-pip-button';

  static override properties = {
    label: { type: String },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<keyof PipButtonCore.Props>;

  label = PipButtonCore.defaultProps.label;
  disabled = PipButtonCore.defaultProps.disabled;

  readonly #core = new PipButtonCore();
  readonly #state = new PlayerController(this, playerContext, selectPiP);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => this.#core.toggle(this.#state.value!),
      isDisabled: () => this.disabled || !this.#state.value,
    });

    applyElementProps(this, buttonProps, this.#disconnect.signal);

    if (__DEV__ && !this.#state.value) {
      logMissingFeature(PipButtonElement.tagName, 'pip');
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#state.value;

    if (!media) return;

    const state = this.#core.getState(media);
    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, PipButtonDataAttrs);
  }
}
