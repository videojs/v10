import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { MuxAudioMedia } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class MuxAudio extends MediaAttachMixin(CustomMediaElement('audio', MuxAudioMedia)) {
  static get observedAttributes() {
    return [
      // biome-ignore lint/complexity/noThisInStatic: intentional use of super
      ...super.observedAttributes,
      'type',
      'prefer-playback',
      'debug',
      'cast-src',
      'cast-receiver',
      'cast-content-type',
    ];
  }
}
