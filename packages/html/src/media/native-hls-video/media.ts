import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { GoogleCast } from '@videojs/media/dom/google-cast';
import { addMediaComponent } from '@videojs/media/dom/media-host';
import { NativeHlsMedia } from '@videojs/media/dom/native-hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class NativeHlsVideo extends MediaAttachMixin(CustomMediaElement('video', NativeHlsMedia)) {
  constructor() {
    super();
    addMediaComponent(this.host, new GoogleCast());
  }
}
