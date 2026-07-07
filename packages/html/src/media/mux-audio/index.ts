import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { HlsJsMedia } from '@videojs/core/dom/media/hls-js';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MuxData } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class MuxAudio extends MediaAttachMixin(CustomMediaElement('audio', HlsJsMedia)) {
  constructor() {
    super();
    addComponent(this.host, new MuxData({ playerSoftwareName: 'mux-audio' }));
    addComponent(this.host, new GoogleCast());
  }
}
