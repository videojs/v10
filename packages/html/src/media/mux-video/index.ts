import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { HlsJsMedia } from '@videojs/core/dom/media/hls-js';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MuxData } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class MuxVideo extends MediaAttachMixin(CustomMediaElement('video', HlsJsMedia)) {
  constructor() {
    super();
    addComponent(this.host, new MuxData({ playerSoftwareName: 'mux-video' }));
    addComponent(this.host, new GoogleCast());
  }
}
