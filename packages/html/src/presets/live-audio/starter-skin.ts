import { createShadowStyle } from '@videojs/utils/dom';

import { template } from '../../internal/skins/starter-live-audio/template';
import { SkinElement } from '../skin';

import styles from '../../define/live-audio/starter-skin.css?inline';

/** Packaged starter live-audio UI registered as `<live-audio-starter-skin>`. */
export class StarterLiveAudioSkinElement extends SkinElement {
  static readonly tagName = 'live-audio-starter-skin';
  static styles = createShadowStyle(styles);
  static template = template;
}

declare global {
  interface HTMLElementTagNameMap {
    [StarterLiveAudioSkinElement.tagName]: StarterLiveAudioSkinElement;
  }
}
