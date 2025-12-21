import { SVG_ICONS } from '@videojs/icons';

import { defineCustomElement } from '@/utils/custom-element';
import { MediaChromeIcon } from './media-chrome-icon';

export function getTemplateHTML() {
  return /* html */ `
    ${MediaChromeIcon.getTemplateHTML()}
    <style>
      :host {
        display: var(--media-fullscreen-enter-icon-display, inline-flex);
      }
    </style>
    ${SVG_ICONS.fullscreenEnterAlt}
  `;
}

export class MediaFullscreenEnterAltIconElement extends MediaChromeIcon {
  static getTemplateHTML: () => string = getTemplateHTML;
}

defineCustomElement('media-fullscreen-enter-alt-icon', MediaFullscreenEnterAltIconElement);
