import { QUALITY_AUTO_VALUE, QualityRadioGroupCore, QualityRadioGroupDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectQuality } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuItemIndicatorElement } from '../menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../menu/menu-radio-item-element';

export class QualityRadioGroupElement extends MenuRadioGroupElement {
  static override readonly tagName = 'media-quality-radio-group';

  static override properties = {
    ...MenuRadioGroupElement.properties,
    disabled: { type: Boolean },
    label: { type: String },
  } satisfies PropertyDeclarationMap<'value' | 'label' | 'disabled'>;

  disabled = false;
  label = '';
  formatRendition = QualityRadioGroupCore.defaultProps.formatRendition;

  readonly #core = new QualityRadioGroupCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectQuality);

  #renditionsKey = '';
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
    let state: QualityRadioGroupCore.State | null = null;

    if (media) {
      this.#core.setProps({ formatRendition: this.formatRendition, disabled: this.disabled });
      this.#core.setMedia(media);
      state = this.#core.getState();

      this.value = state.value;
      this.label = this.label || 'Quality';
      this.#syncContent(state);
    }

    super.update(changed);

    if (state) applyStateDataAttrs(this, state, QualityRadioGroupDataAttrs);
  }

  #syncContent(state: QualityRadioGroupCore.State): void {
    const template = this.#getTemplate();
    const templateKey = template?.innerHTML ?? '';
    const renditionsKey = `${state.renditions
      .map((rendition) => `${rendition.value}:${rendition.label}:${rendition.tier ?? ''}:${rendition.badge ?? ''}`)
      .join('|')}::${state.autoLabel}::${templateKey}`;

    if (renditionsKey !== this.#renditionsKey) {
      this.#renditionsKey = renditionsKey;

      for (const child of [...this.children]) {
        if (child instanceof HTMLTemplateElement) continue;
        child.remove();
      }

      this.append(this.#createItem(QUALITY_AUTO_VALUE, state.autoLabel, undefined, undefined, template));
      this.append(
        ...state.renditions.map((rendition) =>
          this.#createItem(rendition.value, rendition.label, rendition.tier, rendition.badge, template)
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

  #createItem(
    value: string,
    label: string,
    tier: string | undefined,
    badge: string | undefined,
    template: HTMLTemplateElement | null
  ): MenuRadioItemElement {
    const item = this.#createItemFromTemplate(template);

    item.value = value;
    item.setAttribute('data-rendition', value);
    this.#setContent(item, label, tier, badge);

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

  #setContent(item: MenuRadioItemElement, label: string, tier: string | undefined, badge: string | undefined): void {
    const labelPart = item.querySelector<HTMLElement>('[data-part~="label"]');
    const tierPart = item.querySelector<HTMLElement>('[data-part~="tier"]');
    const badgePart = item.querySelector<HTMLElement>('[data-part~="badge"]');

    if (labelPart) {
      labelPart.textContent = label;
    }

    if (tierPart) {
      tierPart.textContent = tier ?? '';
      tierPart.hidden = !tier;
    }

    if (badgePart) {
      badgePart.textContent = badge ?? '';
      badgePart.hidden = !badge;
    }

    if (!labelPart && !tierPart && !badgePart) {
      item.textContent = [label, tier, badge].filter(Boolean).join(' ');
    }
  }

  #getTemplate(): HTMLTemplateElement | null {
    for (const child of this.children) {
      if (child instanceof HTMLTemplateElement) return child;
    }

    return null;
  }

  #handleValueChange = (event: Event): void => {
    if (event.target !== this) return;

    const media = this.#mediaState.value;
    if (!media) return;

    const { value } = (event as CustomEvent<{ value: string }>).detail;
    this.#core.selectValue(media, value);
  };
}

export namespace QualityRadioGroupElement {
  export type State = QualityRadioGroupCore.State;
}
