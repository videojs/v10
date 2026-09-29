import { createShadowStyle } from '@videojs/utils/dom';

import { template } from '../../internal/skins/starter-video/template';
import { SkinElement } from '../skin';

import styles from '../../define/video/starter-skin.css?inline';

/** Packaged starter video UI registered as `<video-starter-skin>`. */
export class StarterVideoSkinElement extends SkinElement {
  static readonly tagName = 'video-starter-skin';
  static styles = createShadowStyle(styles);
  static template = template;
}

declare global {
  interface HTMLElementTagNameMap {
    [StarterVideoSkinElement.tagName]: StarterVideoSkinElement;
  }
}
