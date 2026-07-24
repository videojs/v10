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
  }
}
