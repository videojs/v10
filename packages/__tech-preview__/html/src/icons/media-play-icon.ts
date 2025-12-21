import { SVG_ICONS } from '@videojs/icons';

import { defineCustomElement } from '@/utils/custom-element';
import { MediaChromeIcon } from './media-chrome-icon';

export function getTemplateHTML() {
  return /* html */ `
    ${MediaChromeIcon.getTemplateHTML()}
    <style>
      :host {
        display: var(--media-play-icon-display, inline-flex);
      }
    </style>
    ${SVG_ICONS.play}
  `;
}

export class MediaPlayIconElement extends MediaChromeIcon {
  static getTemplateHTML: () => string = getTemplateHTML;
}

defineCustomElement('media-play-icon', MediaPlayIconElement);
