import { getMediaCapabilities, type MediaCapabilityManifest } from '@videojs/media';
import { MediaTracksMixin } from '@videojs/media/media-tracks';

import { HlsVideoMediaMixin } from './adapter';
import { hlsVideoMediaCapabilities } from './capabilities';
import { SpfVideoHost } from './host';
import { HlsVideoMediaMediaTracksMixin } from './media-tracks';

const HlsVideoMediaBase = HlsVideoMediaMediaTracksMixin(MediaTracksMixin(HlsVideoMediaMixin(SpfVideoHost)));

export class HlsVideoMedia extends HlsVideoMediaBase {
  /**
   * EXPLORATION (see #2573): manifest-as-metadata. The adapter's owned surface is implemented by the mixin, not
   * composed by `createMediaHost`, but declaring it here keeps the manifest an honest description of the official
   * API — `supportsMediaCapability` and `getMediaCapabilityEvents` cover `stream-type`/`live`/`error`, while `engine`
   * stays deliberately off-manifest as not-yet-official surface.
   */
  static readonly capabilities: MediaCapabilityManifest['capabilities'] = new Map([
    ...getMediaCapabilities(HlsVideoMediaBase),
    ...hlsVideoMediaCapabilities.map((capability) => [capability.name, capability] as const),
  ]);
}
