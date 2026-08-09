export interface SkinRegistryConfig {
  name: string;
  homepage: string;
  namespace: string;
  installRoot: string;
  items: readonly string[];
}

/** React/Tailwind publication policy. Canonical Skin ownership remains in ../manifest.ts. */
export const skinRegistry = {
  name: 'videojs',
  homepage: 'https://videojs.org',
  namespace: '@videojs',
  installRoot: 'components/videojs',
  items: [
    'default-video',
    'fullscreen-button',
    'play-button',
    'seek-button',
    'time-slider',
    'volume-popover',
    'volume-slider',
  ],
} as const satisfies SkinRegistryConfig;
