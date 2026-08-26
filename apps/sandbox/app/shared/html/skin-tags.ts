import type { Skin } from '@app/types';

type SkinTagMap = Record<Skin, { video: string; audio: string }>;

export const CSS_SKIN_TAGS: SkinTagMap = {
  default: { video: 'video-skin', audio: 'audio-skin' },
  minimal: { video: 'video-minimal-skin', audio: 'audio-minimal-skin' },
};

/** Custom element tag names for the live HLS video preset (`@videojs/html/live-video` skins). */
export const LIVE_VIDEO_CSS_SKIN_TAGS: Record<Skin, string> = {
  default: 'live-video-skin',
  minimal: 'live-video-minimal-skin',
};
