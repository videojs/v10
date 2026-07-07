import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { NativeHlsMedia } from '@videojs/core/dom/media/native-hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class NativeHlsVideo extends MediaAttachMixin(CustomMediaElement('video', NativeHlsMedia)) {
  constructor() {
    super();
    addComponent(this.host, new GoogleCast());
  }
}
