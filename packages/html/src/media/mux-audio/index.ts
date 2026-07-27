import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MuxData, MuxMedia } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

const MuxAudioBase = MediaAttachMixin(CustomMediaElement('audio', MuxMedia));

export class MuxAudio extends MuxAudioBase {
  constructor() {
    super();
    addComponent(this.host, new MuxData({ playerSoftwareName: 'mux-audio' }));
    addComponent(this.host, new GoogleCast());
    // Mirror the host `src` back to the `src` attribute when the JS-only
    // `source` property derives a new URL.
    this.host.addEventListener('sourcechange', () => this.#reflectSrc());
  }

  #reflectSrc(): void {
    const src = this.host.src;
    if (src) {
      if (this.getAttribute('src') !== src) this.setAttribute('src', src);
    } else if (this.hasAttribute('src')) {
      this.removeAttribute('src');
    }
  }
}
