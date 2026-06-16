import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { HlsMedia } from '@videojs/core/dom/media/hls';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsVideo extends MediaAttachMixin(CustomMediaElement('video', HlsMedia)) {
  constructor() {
    super();
    addComponent(this.host, new GoogleCast());
  }
}
