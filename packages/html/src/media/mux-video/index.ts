import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { MuxVideoMedia } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class MuxVideo extends MediaAttachMixin(CustomMediaElement('video', MuxVideoMedia)) {
  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return [...super.observedAttributes, 'type', 'prefer-playback', 'debug'];
  }
}
