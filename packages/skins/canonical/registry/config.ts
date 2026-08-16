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
  styleItem: {
    name: string;
    title: string;
    description: string;
  };
  utilityItem: {
    name: string;
    title: string;
    description: string;
    source: string;
    target: string;
    dependencies: readonly string[];
  };
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
  styleItem: {
    name: 'styles',
    title: 'Video.js Skin Styles',
    description: 'Shared Tailwind input, scoped base styles, and Default and Minimal Skin themes.',
  },
  utilityItem: {
    name: 'utils',
    title: 'Video.js Utilities',
    description: 'Class-name composition and state resolution utilities used by editable Video.js Skin components.',
    source: '../build/registry/templates/utils.ts',
    target: 'utils.ts',
    dependencies: ['clsx', 'tailwind-merge'],
  },
  items: [
    'airplay-button',
    'buffering-indicator',
    'captions-button',
    'cast-button',
    'default-video',
    'error-dialog',
    'fullscreen-button',
    'overlay',
    'pip-button',
    'play-button',
    'poster',
    'seek-button',
    'seek-indicator',
    'status-announcer',
    'status-indicator',
    'container',
    'time-slider',
    'volume-popover',
    'volume-indicator',
    'volume-slider',
  ],
} as const satisfies SkinRegistryConfig;
