export type Renderer = 'background-video' | 'hls' | 'html5-audio' | 'html5-video';

export type Skin = 'video' | 'audio' | 'minimal-video' | 'minimal-audio';

export type UseCase = 'default-video' | 'default-audio' | 'background-video';

export type InstallMethod = 'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun';

export const VALID_RENDERERS: Record<UseCase, Renderer[]> = {
  'default-video': ['html5-video', 'hls'],
  'default-audio': ['html5-audio'],
  'background-video': ['background-video'],
};
