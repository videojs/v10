import {
  PlaybackRateRadioGroupCore,
  PlaybackRateRadioGroupDataAttrs,
  type PlaybackRateRadioGroupOption,
} from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { i18nContext } from '../../i18n/context';
import { I18nController } from '../../i18n/controller';
import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuRadioGroupElement } from '../menu/menu-radio-group-element';
import { RadioOptionsController } from '../radio-options/radio-options-controller';

export class PlaybackRateRadioGroupElement extends MenuRadioGroupElement {
  static override readonly tagName = 'media-playback-rate-radio-group';

  static override properties = {
    ...MenuRadioGroupElement.properties,
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<'value' | 'disabled'>;

  disabled = false;
  formatRate = PlaybackRateRadioGroupCore.defaultProps.formatRate;

  readonly #core = new PlaybackRateRadioGroupCore();
  readonly #i18n = new I18nController(this, i18nContext);
  readonly #mediaState = new PlayerController(this, playerContext, selectPlaybackRate);
  readonly #options = new RadioOptionsController<PlaybackRateRadioGroupOption>(this, {
    getTemplate: () => this.getTemplate(),
    createItem: (template) => this.createRadioItem(template),
    renderItem: (item, label) => this.setItemLabel(item, label),
    setItemAttributes: (item, option) => item.setAttribute('data-rate', option.value),
    onValueChange: (value) => {
      const media = this.#mediaState.value;
      if (media) this.#core.selectValue(media, value);
    },
  });

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  protected override update(changed: PropertyValues): void {
    const media = this.#mediaState.value;
    let state: PlaybackRateRadioGroupCore.State | null = null;

    if (media) {
      this.#core.setProps({ formatRate: this.formatRate, disabled: this.disabled });
      this.#core.setMedia(media);
      state = this.#core.getState();

      this.applyAriaLabel(this.#i18n.value, this.#core.getLabel(state), this.#core.getLabelParams(state));
      this.#options.sync(state, this.#i18n.value, this.#i18n.locale);
    }

    super.update(changed);

    if (state) applyStateDataAttrs(this, state, PlaybackRateRadioGroupDataAttrs);
  }
}

export namespace PlaybackRateRadioGroupElement {
  export type State = PlaybackRateRadioGroupCore.State;
}
