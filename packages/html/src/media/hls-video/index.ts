import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { HlsMedia } from '@videojs/core/dom/media/hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsVideo extends MediaAttachMixin(CustomMediaElement('video', HlsMedia)) {
  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return [...super.observedAttributes, 'type', 'prefer-playback', 'debug'];
  }
}
