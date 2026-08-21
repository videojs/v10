import type { Video } from '../../core/types';
import type { WistiaSource } from './source';

/**
 * The `Video` members a Wistia player accepts, plus the source that names the media and carries Wistia's own options.
 * All live — the player is an element on the page — except `preload`, read only as it is created.
 */
export interface WistiaMediaProps extends Pick<
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
