import { PlaybackRateRadioGroupCore, PlaybackRateRadioGroupDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { i18nContext } from '../../i18n/context';
import { I18nController } from '../../i18n/controller';
import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuItemIndicatorElement } from '../menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../menu/menu-radio-item-element';

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

  #ratesKey = '';
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    this.addEventListener('value-change', this.#handleValueChange, { signal: this.#disconnect.signal });

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(changed: PropertyValues): void {
    const media = this.#mediaState.value;
    let state: PlaybackRateRadioGroupCore.State | null = null;

    if (media) {
      this.#core.setProps({ formatRate: this.formatRate, disabled: this.disabled });
      this.#core.setMedia(media);
      state = this.#core.getState();

      this.value = this.#core.getRateValue(state.rate);
      this.applyAriaLabel(this.#i18n.value, this.#core.getLabel(state), this.#core.getLabelParams(state));
      applyElementProps(this, {
        'aria-disabled': state.disabled ? 'true' : undefined,
      });

      this.#syncContent(state);
    }

    super.update(changed);

    if (state) applyStateDataAttrs(this, state, PlaybackRateRadioGroupDataAttrs);
  }

  #syncContent(state: PlaybackRateRadioGroupCore.State): void {
    const template = this.getTemplate();
    const templateKey = template?.innerHTML ?? '';
    const ratesKey = `${state.rates.join('|')}::${templateKey}`;

    if (ratesKey !== this.#ratesKey) {
      this.#ratesKey = ratesKey;

      for (const child of [...this.children]) {
        if (child instanceof HTMLTemplateElement) continue;
        child.remove();
      }

      this.append(...state.rates.map((rate) => this.#createItem(rate, template)));
    }

    for (const item of this.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)) {
      const checked = item.value === this.value;

      item.disabled = state.disabled;

      for (const indicator of item.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)) {
        indicator.checked = checked;
      }
    }
  }

  #createItem(rate: number, template: HTMLTemplateElement | null): MenuRadioItemElement {
    const item = this.createRadioItem(template);
    const value = this.#core.getRateValue(rate);

    item.value = value;
    item.setAttribute('data-rate', value);
    this.setItemLabel(item, this.#core.getRateLabel(rate));

    return item;
  }

  #handleValueChange = (event: Event): void => {
    if (event.target !== this) return;

    const media = this.#mediaState.value;
    if (!media) return;

    const { value } = (event as CustomEvent<{ value: string }>).detail;
    this.#core.selectValue(media, value);
  };
}

export namespace PlaybackRateRadioGroupElement {
  export type State = PlaybackRateRadioGroupCore.State;
}
