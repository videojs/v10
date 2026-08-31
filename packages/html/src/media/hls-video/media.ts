import { CustomMediaElement, defaultCustomMediaProperties } from '@videojs/media/dom/custom-media-element';
import { HlsVideoMedia } from '@videojs/spf/hls-video';

import { MediaAttachMixin } from '../../store/media-attach-mixin';

// EXPLORATION (see #2573): the SPF adapter owns disableRemotePlayback and streamType semantics, so property writes go
// to it directly — typed and un-coalesced — instead of routing through the attribute; the attributes remain input
// channels for markup. Injected via options so the config is deterministic rather than a static override.
const HlsVideoElementBase = CustomMediaElement('video', HlsVideoMedia, {
  properties: {
    ...defaultCustomMediaProperties,
    disableRemotePlayback: { type: Boolean, source: 'host' },
    streamType: { type: String, attribute: 'stream-type', empty: 'unknown', source: 'host' },
  },
});

export class HlsVideo extends MediaAttachMixin(HlsVideoElementBase) {}
