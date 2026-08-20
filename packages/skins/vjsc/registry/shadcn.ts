import type { ShadcnRegistryDefinition } from 'vjsc/shadcn';

import type { SkinModuleMeta } from '../meta';

const paths = {
  output: 'vjsc/registry',
  source: 'default',
  install: 'components/videojs',
  import: '@/components/videojs',
} as const;

const styles = {
  tailwind: {
    compiler: './styles/tailwind.css',
    registry: './styles/tailwind.registry.css',
    shared: './styles/tailwind.shared.css',
  },
  base: './styles/base.css',
  shared: ['./styles/captions.css', './styles/themes/video.css'],
  themes: {
    default: './styles/themes/default.css',
    minimal: './styles/themes/minimal.css',
  },
} as const;

/** React/Tailwind publication policy for the Skin inventory. */
export const skinRegistry = {
  name: 'videojs',
  homepage: 'https://videojs.org',
  namespace: '@videojs',
  paths,
  meta: {
    framework: 'react',
    style: 'tailwind',
    skin: 'default-video',
  },
  items: {
    published: [
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
    describe: (item) => ({
      type: item.type === 'skin' ? 'registry:block' : 'registry:component',
      title: item.title,
      description: item.description,
    }),
    shared: [
      {
        name: 'styles',
        type: 'registry:style',
        title: 'Video.js Skin Styles',
        description: 'Shared Tailwind input, base behavior, and Default and Minimal video themes.',
        requiredBy: 'all',
        files: [
          { source: styles.tailwind.registry, path: styles.tailwind.compiler },
          { source: styles.tailwind.shared },
          { source: styles.base },
          ...styles.shared.map((source) => ({ source })),
          ...Object.entries(styles.themes)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([, source]) => ({ source })),
        ],
      },
      {
        name: 'utils',
        type: 'registry:lib',
        title: 'Video.js Utilities',
        description: 'Class-name composition and state resolution utilities used by editable Video.js components.',
        files: [{ source: './registry/utils.ts', path: 'utils.ts' }],
      },
    ],
  },
} as const satisfies ShadcnRegistryDefinition<SkinModuleMeta>;
