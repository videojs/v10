import type { Renderer } from './renderers';

export type Skin = 'video' | 'audio' | 'minimal-video' | 'minimal-audio' | 'none';

/** Public skin values accepted by installation requests. */
export const INSTALLATION_SKIN_FLAGS = ['default', 'minimal', 'none'] as const;

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
 * Installation presets in the order shown by the site and `agents init` option summary.
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

// The Mux Data extension subpath (`extensions/<subpath>` in `@videojs/html`,
// `@videojs/react`, and the CDN). Mux Data is a separate extension the
// installation examples pair with Mux media by default, so it is imported and
// registered alongside the Mux media rather than merged into it.
export const MUX_DATA_EXTENSION_SUBPATH = 'mux-data';

// The package that ships the Mux Data extension; installed alongside the Mux
// media adapter package.
export const MUX_DATA_PACKAGE = '@videojs/mux-data';
