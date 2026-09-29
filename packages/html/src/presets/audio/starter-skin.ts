import { createShadowStyle } from '@videojs/utils/dom';

import { template } from '../../internal/skins/starter-audio/template';
import { SkinElement } from '../skin';

import styles from '../../define/audio/starter-skin.css?inline';

/** Packaged starter audio UI registered as `<audio-starter-skin>`. */
export class StarterAudioSkinElement extends SkinElement {
  static readonly tagName = 'audio-starter-skin';
  static styles = createShadowStyle(styles);
  static template = template;
}

declare global {
  interface HTMLElementTagNameMap {
    [StarterAudioSkinElement.tagName]: StarterAudioSkinElement;
  }
}
