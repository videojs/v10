import type { MediaPreloadType } from '@videojs/media';

import type { YouTubeSource } from './source';

export interface YouTubeAdapterProps {
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
