/**
 * Every media renderer the installation flow can offer.
 *
 * Listed alphabetically; the order a picker shows comes from each preset's `renderers`, not from here. Exported so
 * callers can walk the full set — see `renderersWithoutCdn` in `./cdn-code`.
 */
export const RENDERERS = [
  'background-video',
  'cloudflare',
  'dash',
  'hls',
  'html5-audio',
  'html5-video',
  'mux-audio',
  'mux-video',
  'spotify',
  'tiktok',
  'twitch',
  'vimeo',
  'youtube',
] as const;

export type Renderer = (typeof RENDERERS)[number];

export type Skin = 'video' | 'audio' | 'minimal-video' | 'minimal-audio' | 'none';

export type InstallMethod = 'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface InstallationPreset {
  label: string;
  flag: string;
  group: string;
  tagPrefix: string;
  componentPrefix: string;
  mediaType: 'video' | 'audio';
  live: boolean;
  renderers: readonly Renderer[];
}

/**
 * Installation presets in the order shown by the site and CLI.
 *
 * Renderer order is also guidance: index 0 is the default when URL detection has no match. Live presets include only
 * media that exposes Video.js live-edge state; DASH playback does not currently provide that capability.
 */
export const INSTALLATION_PRESETS = {
  'default-video': {
    label: 'Video',
    flag: 'video',
    group: 'video',
    tagPrefix: 'video',
    componentPrefix: 'Video',
    mediaType: 'video',
    live: false,
    renderers: ['html5-video', 'hls', 'dash', 'mux-video', 'vimeo', 'youtube', 'cloudflare', 'tiktok', 'twitch'],
  },
  'default-audio': {
    label: 'Audio',
    flag: 'audio',
    group: 'audio',
    tagPrefix: 'audio',
    componentPrefix: 'Audio',
    mediaType: 'audio',
    live: false,
    renderers: ['html5-audio', 'mux-audio', 'spotify'],
  },
  'live-video': {
    label: 'Live Video',
    flag: 'live-video',
    group: 'live-video',
    tagPrefix: 'live-video',
    componentPrefix: 'LiveVideo',
    mediaType: 'video',
    live: true,
    renderers: ['hls', 'mux-video'],
  },
  'live-audio': {
    label: 'Live Audio',
    flag: 'live-audio',
    group: 'live-audio',
    tagPrefix: 'live-audio',
    componentPrefix: 'LiveAudio',
    mediaType: 'audio',
    live: true,
    renderers: ['mux-audio'],
  },
  'background-video': {
    label: 'Background Video',
    flag: 'background-video',
    group: 'background',
    tagPrefix: 'background-video',
    componentPrefix: 'BackgroundVideo',
    mediaType: 'video',
    live: false,
    renderers: ['background-video'],
  },
} as const satisfies Record<string, InstallationPreset>;

export type UseCase = keyof typeof INSTALLATION_PRESETS;

export const USE_CASES = Object.keys(INSTALLATION_PRESETS) as UseCase[];

export function getInstallationPreset(useCase: UseCase): InstallationPreset {
  return INSTALLATION_PRESETS[useCase];
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
    youtube: 'youtube-video',
    cloudflare: 'cloudflare-video',
    spotify: 'spotify-audio',
    tiktok: 'tiktok-video',
    twitch: 'twitch-video',
  };

  return map[renderer] ?? null;
}
