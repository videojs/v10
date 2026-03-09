import type { Skin } from '../../types';

type SkinTagMap = Record<Skin, { video: string; audio: string }>;

export const CSS_SKIN_TAGS: SkinTagMap = {
  default: { video: 'video-skin', audio: 'audio-skin' },
  minimal: { video: 'video-minimal-skin', audio: 'audio-minimal-skin' },
};

export const TAILWIND_SKIN_TAGS: SkinTagMap = {
  default: { video: 'video-skin-tailwind', audio: 'audio-skin-tailwind' },
  minimal: { video: 'video-minimal-skin-tailwind', audio: 'audio-minimal-skin-tailwind' },
};
