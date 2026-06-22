import { CAPTIONS_OFF_VALUE, CaptionsRadioGroupCore, CaptionsRadioGroupDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import { resolveTranslationPhrase, type Translator } from '@videojs/core/i18n/base';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { I18nController } from '../../i18n/instance';
import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuItemIndicatorElement } from '../menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../menu/menu-radio-item-element';

export class CaptionsRadioGroupElement extends MenuRadioGroupElement {
  static override readonly tagName = 'media-captions-radio-group';

  static override properties = {
    ...MenuRadioGroupElement.properties,
    disabled: { type: Boolean },
    label: { type: String },
  } satisfies PropertyDeclarationMap<'value' | 'label' | 'disabled'>;

  disabled = false;
  label = '';

  readonly #core = new CaptionsRadioGroupCore();
  readonly #i18n = new I18nController(this);
  readonly #mediaState = new PlayerController(this, playerContext, selectTextTrack);

  #tracksKey = '';
  #tracksTranslator: Translator | null = null;
  #ariaLabel: string | null = null;
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
    let state: CaptionsRadioGroupCore.State | null = null;

    if (media) {
      this.#core.setProps({ disabled: this.disabled });
      this.#core.setMedia(media);
      state = this.#core.getState();

      this.value = state.value;
      this.#applyAriaLabel(this.label || 'menuCaptions');
      this.#syncContent(state);
    }

    super.update(changed);

    if (state) applyStateDataAttrs(this, state, CaptionsRadioGroupDataAttrs);
  }

  #syncContent(state: CaptionsRadioGroupCore.State): void {
    const template = this.#getTemplate();
    const templateKey = template?.innerHTML ?? '';
    const translator = this.#i18n.value;
    const tracksKey = `${state.tracks.map((track) => `${track.value}:${track.label}:${track.labelKey ?? ''}`).join('|')}::${this.#i18n.locale}::${templateKey}`;

    if (tracksKey !== this.#tracksKey || translator !== this.#tracksTranslator) {
      this.#tracksKey = tracksKey;
      this.#tracksTranslator = translator;

      for (const child of [...this.children]) {
        if (child instanceof HTMLTemplateElement) continue;
        child.remove();
      }

      this.append(this.#createItem(CAPTIONS_OFF_VALUE, resolveTranslationPhrase(translator, 'menuOff'), template));
      this.append(
        ...state.tracks.map((track) =>
          this.#createItem(track.value, resolveTranslationPhrase(translator, track.labelKey ?? track.label), template)
        )
      );
    }

    for (const item of this.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)) {
      const checked = item.value === this.value;

      item.disabled = state.disabled;

      for (const indicator of item.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)) {
        indicator.checked = checked;
      }
    }
  }

  #createItem(value: string, label: string, template: HTMLTemplateElement | null): MenuRadioItemElement {
    const item = this.#createItemFromTemplate(template);

    item.value = value;
    item.setAttribute('data-track', value);
    this.#setLabel(item, label);

    return item;
  }

  #createItemFromTemplate(template: HTMLTemplateElement | null): MenuRadioItemElement {
    if (!template) return document.createElement(MenuRadioItemElement.tagName) as MenuRadioItemElement;

    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const root = fragment.firstElementChild;

    if (!root || root.localName !== MenuRadioItemElement.tagName || root.nextElementSibling) {
      return document.createElement(MenuRadioItemElement.tagName) as MenuRadioItemElement;
    }

    return root as MenuRadioItemElement;
  }

  #setLabel(item: MenuRadioItemElement, label: string): void {
    const labelPart = item.querySelector<HTMLElement>('[data-part~="label"]');

    if (labelPart) {
      labelPart.textContent = label;
    } else {
      item.textContent = label;
    }
  }

  #getTemplate(): HTMLTemplateElement | null {
    for (const child of this.children) {
      if (child instanceof HTMLTemplateElement) return child;
    }

    return null;
  }

  #applyAriaLabel(label: string): void {
    if (this.hasAttribute('aria-labelledby')) return;

    const current = this.getAttribute('aria-label');
    if (current !== null && current !== this.#ariaLabel) return;

    this.#ariaLabel = resolveTranslationPhrase(this.#i18n.value, label);
    this.setAttribute('aria-label', this.#ariaLabel);
  }

  #handleValueChange = (event: Event): void => {
    if (event.target !== this) return;

    const media = this.#mediaState.value;
    if (!media) return;

    const { value } = (event as CustomEvent<{ value: string }>).detail;
    this.#core.selectValue(media, value);
  };
}

export namespace CaptionsRadioGroupElement {
  export type State = CaptionsRadioGroupCore.State;
}
