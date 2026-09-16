import { createShadowStyle } from '@videojs/utils/dom';

import { template } from '../../internal/skins/minimal-live-video/template';
import { SkinElement } from '../skin';

import styles from '../../define/live-video/minimal-skin.css?inline';

/** Packaged Minimal live-video UI registered as `<live-video-minimal-skin>`. */
export class MinimalLiveVideoSkinElement extends SkinElement {
  static readonly tagName = 'live-video-minimal-skin';
  static styles = createShadowStyle(styles);
  static template = template;
}

declare global {
  interface HTMLElementTagNameMap {
    [MinimalLiveVideoSkinElement.tagName]: MinimalLiveVideoSkinElement;
  }
}
