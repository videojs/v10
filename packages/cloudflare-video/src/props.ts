import type { Video } from '@videojs/media';

import type { CloudflareSource } from './source';

/**
 * The `Video` members the Cloudflare host accepts, plus the source that names the video. `playsInline` is stored and
 * reported but never reaches the player: the Stream embed has no inline-playback knob and plays inline on its own.
 */
export interface CloudflareAdapterProps extends Pick<
  Video,
  'src' | 'autoplay' | 'defaultMuted' | 'muted' | 'loop' | 'controls' | 'playsInline' | 'preload' | 'poster'
> {
  source: CloudflareSource | null;
}
