import type { Video } from '@videojs/media';

import type { WistiaSource } from './source';

/**
 * The `Video` members a Wistia player accepts, plus the source that names the media and carries Wistia's own options.
 * All live — the player is an element on the page — except `preload`, read only as it is created.
 */
export interface WistiaAdapterProps extends Pick<
  Video,
  'src' | 'autoplay' | 'defaultMuted' | 'muted' | 'loop' | 'controls' | 'playsInline' | 'preload' | 'poster'
> {
  source: WistiaSource | null;
}
