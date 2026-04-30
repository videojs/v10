import { MediaElement } from '../media-element';

/** Label region inside `media-tooltip`; parent syncs text from the trigger when linked to a media button. */
export class TooltipLabelElement extends MediaElement {
  static readonly tagName = 'media-tooltip-label';

  static findIn(host: HTMLElement): TooltipLabelElement | null {
    return host.querySelector(TooltipLabelElement.tagName);
  }

  static create(): TooltipLabelElement {
    return document.createElement(TooltipLabelElement.tagName) as TooltipLabelElement;
  }

  setSyncedText(text: string): void {
    this.textContent = text;
  }
}
