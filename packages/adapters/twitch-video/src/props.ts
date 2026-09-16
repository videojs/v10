import type { Video } from '@videojs/media';

import type { TwitchSource } from './source';

/**
 * The `Video` members the Twitch host accepts, plus the source that names the video or channel. Three of them never
 * reach the embed: `loop`, which it has no parameter for and the host emulates by seeking a finished VOD back to the
 * start (a live channel never ends, so it never repeats); `playsInline`, which Twitch decides for itself on a phone;
 * and `poster`, which the embed draws itself and offers no way to replace.
 */
export interface TwitchAdapterProps extends Pick<
  Video,
  'src' | 'autoplay' | 'defaultMuted' | 'muted' | 'loop' | 'controls' | 'playsInline' | 'preload' | 'poster'
> {
  source: TwitchSource | null;
}
