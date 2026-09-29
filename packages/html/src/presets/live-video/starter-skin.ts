import { createShadowStyle } from '@videojs/utils/dom';

import { template } from '../../internal/skins/starter-live-video/template';
import { SkinElement } from '../skin';

import styles from '../../define/live-video/starter-skin.css?inline';

/** Packaged starter live-video UI registered as `<live-video-starter-skin>`. */
export class StarterLiveVideoSkinElement extends SkinElement {
  static readonly tagName = 'live-video-starter-skin';
  static styles = createShadowStyle(styles);
  static template = template;
}

declare global {
  interface HTMLElementTagNameMap {
    [StarterLiveVideoSkinElement.tagName]: StarterLiveVideoSkinElement;
  }
}
