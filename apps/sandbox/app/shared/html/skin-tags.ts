import type { Skin } from '@app/types';

type SkinTagMap = Record<Skin, { video: string; audio: string }>;

export const CSS_SKIN_TAGS: SkinTagMap = {
  default: { video: 'video-skin', audio: 'audio-skin' },
  minimal: { video: 'video-minimal-skin', audio: 'audio-minimal-skin' },
};

export const TAILWIND_SKIN_TAGS: SkinTagMap = {
  default: { video: 'video-skin-tailwind', audio: 'audio-skin-tailwind' },
  minimal: { video: 'video-minimal-skin-tailwind', audio: 'audio-minimal-skin-tailwind' },
};

/** Custom element tag names for the live HLS video preset (`@videojs/html/live-video` skins). */
export const LIVE_VIDEO_CSS_SKIN_TAGS: Record<Skin, string> = {
  default: 'live-video-skin',
  minimal: 'live-video-minimal-skin',
};

export const LIVE_VIDEO_TAILWIND_SKIN_TAGS: Record<Skin, string> = {
  default: 'live-video-skin-tailwind',
  minimal: 'live-video-minimal-skin-tailwind',
};
