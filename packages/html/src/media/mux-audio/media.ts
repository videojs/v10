import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { MuxMedia } from '@videojs/media/dom/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

const MuxAudioBase = MediaAttachMixin(CustomMediaElement('audio', MuxMedia));

export class MuxAudio extends MuxAudioBase {
  constructor() {
    super();
    this.host.addEventListener('sourcechange', () => this.#reflectSrc());
  }

  // Mirrors the host `src` to the `src` attribute so it matches the active playback URL.
  #reflectSrc() {
    const src = this.host.src;
    if (src) {
      if (this.getAttribute('src') !== src) this.setAttribute('src', src);
    } else if (this.hasAttribute('src')) {
      this.removeAttribute('src');
    }
  }
}
