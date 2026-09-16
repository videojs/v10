import { createShadowStyle } from '@videojs/utils/dom';

import { template } from '../../internal/skins/minimal-live-audio/template';
import { SkinElement } from '../skin';

import styles from '../../define/live-audio/minimal-skin.css?inline';

/** Packaged Minimal live-audio UI registered as `<live-audio-minimal-skin>`. */
export class MinimalLiveAudioSkinElement extends SkinElement {
  static readonly tagName = 'live-audio-minimal-skin';
  static styles = createShadowStyle(styles);
  static template = template;
}

declare global {
  interface HTMLElementTagNameMap {
    [MinimalLiveAudioSkinElement.tagName]: MinimalLiveAudioSkinElement;
  }
}
