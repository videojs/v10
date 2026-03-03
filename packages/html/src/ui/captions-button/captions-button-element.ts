import { CaptionsButtonCore, CaptionsButtonDataAttrs } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createButton,
  logMissingFeature,
  selectTextTrack,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class CaptionsButtonElement extends MediaElement {
  static readonly tagName = 'media-captions-button';

  static override properties = {
    label: { type: String },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<keyof CaptionsButtonCore.Props>;

  label = CaptionsButtonCore.defaultProps.label;
  disabled = CaptionsButtonCore.defaultProps.disabled;

  readonly #core = new CaptionsButtonCore();
  readonly #state = new PlayerController(this, playerContext, selectTextTrack);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => this.#core.toggle(this.#state.value!),
      isDisabled: () => this.disabled || !this.#state.value || this.#state.value.subtitlesList.length === 0,
    });

    applyElementProps(this, buttonProps, this.#disconnect.signal);

    if (__DEV__ && !this.#state.value) {
      logMissingFeature(CaptionsButtonElement.tagName, 'textTrack');
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

    if (!media) {
      this.hidden = true;
      return;
    }

    this.hidden = media.subtitlesList.length === 0;

    const state = this.#core.getState(media);
    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, CaptionsButtonDataAttrs);
  }
}
