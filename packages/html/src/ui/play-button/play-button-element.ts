import type { PropertyValues } from '@lit/reactive-element';
import { PlayButtonCore, PlayButtonDataAttrs } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createButton,
  logMissingFeature,
  selectPlayback,
} from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class PlayButtonElement extends MediaElement {
  static readonly tagName = 'media-play-button';

  static override properties = {
    label: { type: String },
    disabled: { type: Boolean },
  };

  label = '';
  disabled = false;

  readonly #core = new PlayButtonCore();
  readonly #state = new PlayerController(this, playerContext, selectPlayback);

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
      logMissingFeature(PlayButtonElement.tagName, 'playback');
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
    applyStateDataAttrs(this, state, PlayButtonDataAttrs);
  }
}
