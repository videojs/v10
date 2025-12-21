import { SVG_ICONS } from '@videojs/icons';

import { defineCustomElement } from '@/utils/custom-element';
import { MediaChromeIcon } from './media-chrome-icon';

export function getTemplateHTML() {
  return /* html */ `
    ${MediaChromeIcon.getTemplateHTML()}
    <style>
      :host {
        display: var(--media-fullscreen-exit-icon-display, inline-flex);
      }
    </style>
    ${SVG_ICONS.fullscreenExit}
  `;
}

export class MediaFullscreenExitIconElement extends MediaChromeIcon {
  static getTemplateHTML: () => string = getTemplateHTML;
}

defineCustomElement('media-fullscreen-exit-icon', MediaFullscreenExitIconElement);
