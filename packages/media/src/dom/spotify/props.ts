import type { Video } from '../../core/types';
import type { SpotifySource } from './source';

/**
 * The `Video` members the Spotify host accepts, plus the source that names the entity. Narrower than the other embed
 * hosts by one pair: the embed takes no volume or mute command and reports neither value, so `muted` and `defaultMuted`
 * are absent rather than inert — a prop that cannot reach the player reads as a capability the player has. `poster` has
 * no artwork of its own to replace and `playsInline` no inline-playback switch, so those two are kept for a uniform
 * prop shape but are stored and reported without effect.
 */
export interface SpotifyMediaProps extends Pick<
  Video,
  'src' | 'autoplay' | 'loop' | 'controls' | 'playsInline' | 'preload' | 'poster'
> {
  source: SpotifySource | null;
}

export const spotifyMediaDefaultProps: SpotifyMediaProps = {
  src: '',
  autoplay: false,
  loop: false,
  controls: false,
  playsInline: true,
  preload: 'metadata',
  poster: '',
  source: null,
};
