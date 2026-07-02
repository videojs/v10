import { MediaElement } from '../media-element';

function hasAuthoredContent(host: HTMLElement): boolean {
  return Array.from(host.childNodes).some((node) => !!node.textContent?.trim());
}

/** Label region inside `media-tooltip`; parent syncs text from the trigger when linked to a media button. */
export class TooltipLabelElement extends MediaElement {
  static readonly tagName = 'media-tooltip-label';

  #hasAuthoredContent = false;

  static findIn(host: HTMLElement): TooltipLabelElement | null {
    return host.querySelector(TooltipLabelElement.tagName);
  }

  static create(): TooltipLabelElement {
    return document.createElement(TooltipLabelElement.tagName) as TooltipLabelElement;
  }

  override connectedCallback(): void {
    this.#hasAuthoredContent ||= hasAuthoredContent(this);
    super.connectedCallback();
  }

  setSyncedText(text: string): void {
    if (this.#hasAuthoredContent) return;
    this.textContent = text;
  }
}
