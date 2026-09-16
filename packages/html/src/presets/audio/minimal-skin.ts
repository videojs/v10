import { createShadowStyle } from '@videojs/utils/dom';

import { template } from '../../internal/skins/minimal-audio/template';
import { SkinElement } from '../skin';

import styles from '../../define/audio/minimal-skin.css?inline';

/** Packaged Minimal audio UI registered as `<audio-minimal-skin>`. */
export class MinimalAudioSkinElement extends SkinElement {
  static readonly tagName = 'audio-minimal-skin';
  static styles = createShadowStyle(styles);
  static template = template;
}

declare global {
  interface HTMLElementTagNameMap {
    [MinimalAudioSkinElement.tagName]: MinimalAudioSkinElement;
  }
}
