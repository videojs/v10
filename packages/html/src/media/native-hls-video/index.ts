import { NativeHlsCustomMedia, NativeHlsMediaBase } from '@videojs/core/dom/media/native-hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MediaPropsMixin } from '../../utils/media-props-mixin';

export class NativeHlsVideo extends MediaPropsMixin(MediaAttachMixin(NativeHlsCustomMedia), NativeHlsMediaBase) {
  constructor() {
    super();
    this.attach(this.target);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();

    if (!this.hasAttribute('keep-alive')) {
      this.destroy();
    }
  }
}
