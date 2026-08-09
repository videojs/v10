export interface SkinRegistryConfig {
  name: string;
  homepage: string;
  namespace: string;
  installRoot: string;
  outputDir: string;
  sourceRoot: string;
  skin: string;
  framework: 'react';
  style: 'tailwind';
  items: readonly string[];
}

/** React/Tailwind publication policy for the canonical Skin inventory. */
export const skinRegistry = {
  name: 'videojs',
  homepage: 'https://videojs.org',
  namespace: '@videojs',
  installRoot: 'components/videojs',
  outputDir: 'canonical/registry',
  sourceRoot: 'default',
  skin: 'default-video',
  framework: 'react',
  style: 'tailwind',
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
