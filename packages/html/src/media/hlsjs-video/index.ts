import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { GoogleCast } from '@videojs/media/dom/google-cast';
import { HlsJsMedia } from '@videojs/media/dom/hls-js';
import { addMediaComponent } from '@videojs/media/dom/media-host';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsJsVideo extends MediaAttachMixin(CustomMediaElement('video', HlsJsMedia)) {
  constructor() {
    super();
    addMediaComponent(this.host, new GoogleCast());
  }
}
