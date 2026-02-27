import { PlaybackRateButtonCore, PlaybackRateButtonDataAttrs } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createButton,
  logMissingFeature,
  selectPlaybackRate,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class PlaybackRateButtonElement extends MediaElement {
  static readonly tagName = 'media-playback-rate-button';

  static override properties = {
    label: { type: String },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<keyof PlaybackRateButtonCore.Props>;

  label = PlaybackRateButtonCore.defaultProps.label;
  disabled = PlaybackRateButtonCore.defaultProps.disabled;

  readonly #core = new PlaybackRateButtonCore();
  readonly #state = new PlayerController(this, playerContext, selectPlaybackRate);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => this.#core.cycle(this.#state.value!),
      isDisabled: () => this.disabled || !this.#state.value,
    });

    applyElementProps(this, buttonProps, this.#disconnect.signal);

    if (__DEV__ && !this.#state.value) {
      logMissingFeature(PlaybackRateButtonElement.tagName, 'playbackRate');
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
    applyStateDataAttrs(this, state, PlaybackRateButtonDataAttrs);
  }
}
