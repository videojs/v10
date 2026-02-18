import { SeekButtonCore, SeekButtonDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, createButton, logMissingFeature, selectTime } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class SeekButtonElement extends MediaElement {
  static readonly tagName = 'media-seek-button';

  static override properties = {
    seconds: { type: Number },
    label: { type: String },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<keyof SeekButtonCore.Props>;

  seconds = SeekButtonCore.defaultProps.seconds;
  label = SeekButtonCore.defaultProps.label;
  disabled = SeekButtonCore.defaultProps.disabled;

  readonly #core = new SeekButtonCore();
  readonly #state = new PlayerController(this, playerContext, selectTime);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => this.#core.seek(this.#state.value!),
      isDisabled: () => this.disabled || !this.#state.value,
    });

    applyElementProps(this, buttonProps, this.#disconnect.signal);

    if (__DEV__ && !this.#state.value) {
      logMissingFeature(SeekButtonElement.tagName, 'time');
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
    applyStateDataAttrs(this, state, SeekButtonDataAttrs);
  }
}
