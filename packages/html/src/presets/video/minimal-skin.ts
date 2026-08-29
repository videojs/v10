import { createShadowStyle } from '@videojs/utils/dom';

import { template } from '../../internal/skins/minimal-video/template';
import { SkinElement } from '../skin';

import styles from '../../define/video/minimal-skin.css?inline';

/** Packaged Minimal video UI registered as `<video-minimal-skin>`. */
export class MinimalVideoSkinElement extends SkinElement {
  static readonly tagName = 'video-minimal-skin';
  static styles = createShadowStyle(styles);
  static template = template;
}

declare global {
  interface HTMLElementTagNameMap {
    [MinimalVideoSkinElement.tagName]: MinimalVideoSkinElement;
  }
}
