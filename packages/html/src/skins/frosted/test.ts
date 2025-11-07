import { MediaSkinElement } from '@/media/media-skin';
import { defineCustomElement } from '@/utils/custom-element';
import styles from './styles.css';
// be sure to import video-provider first for proper context initialization
import '@/define/video-provider';
import '@/define/media-container';
import '@/define/media-current-time-display';
import '@/define/media-duration-display';
import '@/define/media-fullscreen-button';
import '@/define/media-mute-button';
import '@/define/media-play-button';
import '@/define/media-popover';
import '@/define/media-preview-time-display';
import '@/define/media-time-slider';
import '@/define/media-tooltip';
import '@/define/media-volume-slider';
import '@/icons';

export function getTemplateHTML() {
  return /* html */`
      ${MediaSkinElement.getTemplateHTML()}
      <style>${styles}</style>

      <!-- TODO: Projected HTML content -->
      <div>Placeholder HTML</div>
    `;
}

export class MediaSkinFrostedElement extends MediaSkinElement {
  static getTemplateHTML: () => string = getTemplateHTML;
}

defineCustomElement('media-skin-frosted', MediaSkinFrostedElement);
