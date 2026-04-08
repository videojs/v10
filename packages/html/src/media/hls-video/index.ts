import { HlsCustomMedia, HlsMediaBase } from '@videojs/core/dom/media/hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MediaPropsMixin } from '../../utils/media-props-mixin';

export class HlsVideo extends MediaPropsMixin(MediaAttachMixin(HlsCustomMedia), HlsMediaBase) {
  constructor() {
    super();
    // TODO: If we like to support native media elements that
    // are appended after the custom element is created, we need to
    // attach the native element to the Media API after the native element
    // is appended to the DOM. This is currently not supported.
    this.attach(this.target);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();

    if (!this.hasAttribute('keep-alive')) {
      this.destroy();
    }
  }
}
