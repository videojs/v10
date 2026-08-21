import type { Video } from '../../core/types';
import type { WistiaSource } from './source';

/**
 * The `Video` members a Wistia player accepts, plus the source that names the media and carries Wistia's
 * own options.
 *
 * Everything here is live: `<wistia-player>` is an element on the page, so a change reaches it. The one
 * exception is `preload`, which Wistia reads only as the player is created.
 */
export interface WistiaMediaProps
  extends Pick<
    Video,
    'src' | 'autoplay' | 'defaultMuted' | 'muted' | 'loop' | 'controls' | 'playsInline' | 'preload' | 'poster'
  > {
  source: WistiaSource | null;
}

export const wistiaMediaDefaultProps: WistiaMediaProps = {
  src: '',
  autoplay: false,
  defaultMuted: false,
  muted: false,
  loop: false,
  controls: false,
  playsInline: true,
  preload: 'metadata',
  poster: '',
  source: null,
};
