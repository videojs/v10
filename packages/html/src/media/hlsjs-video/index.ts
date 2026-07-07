import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { HlsJsMedia } from '@videojs/core/dom/media/hls-js';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsJsVideo extends MediaAttachMixin(CustomMediaElement('video', HlsJsMedia)) {
  constructor() {
    super();
    addComponent(this.host, new GoogleCast());
  }
}
