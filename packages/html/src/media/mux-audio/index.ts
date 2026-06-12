import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { HlsMedia } from '@videojs/core/dom/media/hls';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MuxData } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

// TODO: HlsMedia extends HTMLVideoElementHost, we should compose on top of
// HTMLAudioElementHost instead but this would require a HlsMediaMixin,
// keep it simple for now.
export class MuxAudio extends MediaAttachMixin(CustomMediaElement('audio', HlsMedia)) {
  static get observedAttributes() {
    return [
      // biome-ignore lint/complexity/noThisInStatic: intentional use of super
      ...super.observedAttributes,
      'stream-type',
    ];
  }

  constructor() {
    super();
    addComponent(this.host, new MuxData({ playerSoftwareName: 'mux-audio' }));
    addComponent(this.host, new GoogleCast());
  }
}
