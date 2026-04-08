import { MuxAudioBase, MuxCustomAudio } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MediaPropsMixin } from '../../utils/media-props-mixin';

export class MuxAudio extends MediaPropsMixin(MediaAttachMixin(MuxCustomAudio), MuxAudioBase) {
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
