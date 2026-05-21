import { CaptionsMenuCore, CaptionsMenuDataAttrs, type CaptionsMenuTrack } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuItemIndicatorElement } from '../menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../menu/menu-radio-item-element';

export class CaptionsOptionsElement extends MenuRadioGroupElement {
  static override readonly tagName = 'media-captions-options';

  static override properties = {
    ...MenuRadioGroupElement.properties,
    offLabel: { type: String, attribute: 'off-label' },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<'value' | 'label' | 'offLabel' | 'disabled'>;

  offLabel = CaptionsMenuCore.defaultProps.offLabel;
  disabled = false;
  formatTrack = CaptionsMenuCore.defaultProps.formatTrack;

  readonly #core = new CaptionsMenuCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectTextTrack);

  #tracksKey = '';
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
    let state: CaptionsMenuCore.State | null = null;

    if (media) {
      this.#core.setProps({ formatTrack: this.formatTrack, offLabel: this.offLabel, disabled: this.disabled });
      this.#core.setMedia(media);
      state = this.#core.getState();

      this.value = this.#core.getTrackValue(state.selectedTrackIndex);
      this.label = this.label || this.#core.getMenuSectionLabel();
      this.#syncContent(state);
    }

    super.update(changed);

    if (state) applyStateDataAttrs(this, state, CaptionsMenuDataAttrs);
  }

  #syncContent(state: CaptionsMenuCore.State): void {
    const template = this.#getTemplate();
    const templateKey = template?.innerHTML ?? '';
    const tracksKey = `${state.tracks
      .map((track) => `${track.index}:${track.kind}:${track.label}:${track.language}`)
      .join('|')}::${this.#core.getOffLabel()}::${templateKey}`;

    if (tracksKey !== this.#tracksKey) {
      this.#tracksKey = tracksKey;

      for (const child of [...this.children]) {
        if (child instanceof HTMLTemplateElement) continue;
        child.remove();
      }

      if (state.tracks.length > 0) {
        this.append(this.#createOffItem(template), ...state.tracks.map((track) => this.#createItem(track, template)));
      }
    }

    for (const item of this.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)) {
      const checked = item.value === this.value;

      item.disabled = state.disabled;

      for (const indicator of item.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)) {
        indicator.checked = checked;
      }
    }
  }

  #createOffItem(template: HTMLTemplateElement | null): MenuRadioItemElement {
    const item = this.#createItemFromTemplate(template);

    item.value = this.#core.getTrackValue(null);
    item.setAttribute('data-track', 'off');
    item.removeAttribute('data-track-index');
    item.removeAttribute('data-kind');
    item.removeAttribute('data-language');
    this.#setLabel(item, this.#core.getOffLabel());

    return item;
  }

  #createItem(track: CaptionsMenuTrack, template: HTMLTemplateElement | null): MenuRadioItemElement {
    const item = this.#createItemFromTemplate(template);
    const value = this.#core.getTrackValue(track.index);

    item.value = value;
    item.setAttribute('data-track', value);
    item.setAttribute('data-track-index', value);
    item.setAttribute('data-kind', track.kind);
    item.setAttribute('data-language', track.language);
    this.#setLabel(item, this.#core.getTrackLabel(track));

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

  #handleValueChange = (event: Event): void => {
    if (event.target !== this) return;

    const media = this.#mediaState.value;
    if (!media) return;

    const { value } = (event as CustomEvent<{ value: string }>).detail;
    this.#core.selectValue(media, value);
  };
}

export namespace CaptionsOptionsElement {
  export type State = CaptionsMenuCore.State;
}
