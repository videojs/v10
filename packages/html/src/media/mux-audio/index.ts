import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MuxData, MuxMedia } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

const MuxAudioBase = MediaAttachMixin(CustomMediaElement('audio', MuxMedia));

export class MuxAudio extends MuxAudioBase {
  static properties = {
    ...MuxAudioBase.properties,
    playbackId: { type: String, attribute: 'playback-id', empty: '' },
    customDomain: { type: String, attribute: 'custom-domain', empty: '' },
    maxResolution: { type: String, attribute: 'max-resolution', empty: undefined },
    minResolution: { type: String, attribute: 'min-resolution', empty: undefined },
    renditionOrder: { type: String, attribute: 'rendition-order', empty: undefined },
    programStartTime: { type: Number, attribute: 'program-start-time', empty: undefined },
    programEndTime: { type: Number, attribute: 'program-end-time', empty: undefined },
    assetStartTime: { type: Number, attribute: 'asset-start-time', empty: undefined },
    assetEndTime: { type: Number, attribute: 'asset-end-time', empty: undefined },
    playbackToken: { type: String, attribute: 'playback-token', empty: undefined },
  };

  constructor() {
    super();
    addComponent(this.host, new MuxData({ playerSoftwareName: 'mux-audio' }));
    addComponent(this.host, new GoogleCast());
  }
}
