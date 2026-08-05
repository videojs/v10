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

export type UseCase = 'default-video' | 'default-audio' | 'live-video' | 'live-audio' | 'background-video';

export type InstallMethod = 'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun';

// Order is also guidance: index 0 is the fallback default when there's no URL
// detection, and the list reads top-to-bottom as what we steer users toward —
// common files first, then open streaming formats, then hosting services.
//
// The live use cases list only streaming sources: a progressive file (mp4/mp3)
// can't carry a live presentation, and the live presets exist to surface
// live-edge state, so offering one would generate a player that never reports
// it.
export const VALID_RENDERERS: Record<UseCase, Renderer[]> = {
  'default-video': ['html5-video', 'hls', 'dash', 'mux-video', 'vimeo'],
  'default-audio': ['html5-audio', 'mux-audio'],
  'live-video': ['hls', 'dash', 'mux-video'],
  'live-audio': ['mux-audio'],
  'background-video': ['background-video'],
};

// Use case → package subpath group, shared by the `@videojs/html` and
// `@videojs/react` import paths and by the custom-element tag names. The
// generated tags follow `<group>-player` / `<group>-skin` /
// `<group>-minimal-skin`, so this doubles as the tag prefix. `background` is the
// exception: its subpath is `background` but its tags are `background-video-*`.
export function getPresetGroup(useCase: UseCase): string {
  const map: Record<UseCase, string> = {
    'default-video': 'video',
    'default-audio': 'audio',
    'live-video': 'live-video',
    'live-audio': 'live-audio',
    'background-video': 'background',
  };
  return map[useCase];
}

/** Whether the use case renders an `<audio>`-family player rather than video. */
export function isAudioUseCase(useCase: UseCase): boolean {
  return useCase === 'default-audio' || useCase === 'live-audio';
}

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
