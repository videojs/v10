export type Renderer =
  | 'background-video'
  | 'dash'
  | 'hls'
  | 'html5-audio'
  | 'html5-video'
  | 'mux-audio'
  | 'mux-video'
  | 'vimeo';

export type Skin = 'video' | 'audio' | 'minimal-video' | 'minimal-audio' | 'none';

export type UseCase = 'default-video' | 'default-audio' | 'background-video';

export type InstallMethod = 'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun';

// Order is also guidance: index 0 is the fallback default when there's no URL
// detection, and the list reads top-to-bottom as what we steer users toward —
// common files first, then open streaming formats, then hosting services.
export const VALID_RENDERERS: Record<UseCase, Renderer[]> = {
  'default-video': ['html5-video', 'hls', 'dash', 'mux-video', 'vimeo'],
  'default-audio': ['html5-audio', 'mux-audio'],
  'background-video': ['background-video'],
};

// Renderer → media subpath name, independent of whether a CDN build exists.
// Preset renderers (html5-video/audio, background-video) are covered by their
// preset bundle and have no separate media script, so they map to null.
export function getMediaSubpath(renderer: Renderer): string | null {
  const map: Partial<Record<Renderer, string>> = {
    hls: 'hlsjs-video',
    dash: 'dash-video',
    'mux-video': 'mux-video',
    'mux-audio': 'mux-audio',
    vimeo: 'vimeo-video',
  };
  return map[renderer] ?? null;
}
