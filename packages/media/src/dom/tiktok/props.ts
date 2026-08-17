import type { Video } from '../../core/types';
import type { TikTokSource } from './source';

/**
 * The `Video` members the TikTok host accepts, plus the source that names the
 * video. Three are stored and reported but never reach the embed: it always
 * plays inline, it decides for itself what to load ahead, and it draws the
 * video's own cover image, so `playsInline`, `preload`, and `poster` are inert.
 */
export interface TikTokMediaProps
  extends Pick<
    Video,
    'src' | 'autoplay' | 'defaultMuted' | 'muted' | 'loop' | 'controls' | 'playsInline' | 'preload' | 'poster'
  > {
  source: TikTokSource | null;
}

export const tiktokMediaDefaultProps: TikTokMediaProps = {
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
