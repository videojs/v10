import { SimpleHlsCustomMedia } from '@videojs/core/dom/media/simple-hls';
import { SpfMedia } from '@videojs/spf/dom';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MediaPropsMixin } from '../../utils/media-props-mixin';

export class SimpleHlsVideo extends MediaPropsMixin(MediaAttachMixin(SimpleHlsCustomMedia), SpfMedia) {
  constructor() {
    super();
    this.attach(this.target);
  }
}
