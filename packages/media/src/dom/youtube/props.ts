import type { MediaPreloadType } from '../../core/types';
import type { YouTubeSource } from './source';

export interface YouTubeMediaProps {
  src: string;
  autoplay: boolean;
  defaultMuted: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
  playsInline: boolean;
  preload: MediaPreloadType;
  poster: string;
  source: YouTubeSource | null;
}

export const youtubeMediaDefaultProps: YouTubeMediaProps = {
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
