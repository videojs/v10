import { MediaElement } from '../media-element';

/** Shortcut hint inside `media-tooltip`. CSS skins: `class="media-tooltip__kbd"`; Tailwind skins: `class` from `popup.tooltipShortcut`. */
export class TooltipShortcutElement extends MediaElement {
  static readonly tagName = 'media-tooltip-shortcut';

  static findIn(host: HTMLElement): TooltipShortcutElement | null {
    return host.querySelector(TooltipShortcutElement.tagName);
  }

  static create(): TooltipShortcutElement {
    return document.createElement(TooltipShortcutElement.tagName) as TooltipShortcutElement;
  }

  setSyncedShortcut(shortcut: string | undefined): void {
    if (shortcut) {
      this.textContent = shortcut;
      this.hidden = false;
    } else {
      this.textContent = '';
      this.hidden = true;
    }
  }
}
