import { defineShadcnRegistry } from 'vjsc/shadcn';

import { skinCatalog } from '../catalog';

const paths = {
  output: 'canonical/registry',
  source: 'default',
  install: 'components/videojs',
  import: '@/components/videojs',
} as const;

const styles = skinCatalog.resources.styles;

/** React/Tailwind publication policy for the canonical Skin inventory. */
export const skinRegistry = defineShadcnRegistry(skinCatalog, {
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
          ...(styles.shared ?? []).map((source) => ({ source })),
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
        dependencies: ['clsx', 'tailwind-merge'],
        requiredBy: {
          imports: [`${paths.import}/utils`],
        },
        files: [{ source: './registry/utils.ts', path: 'utils.ts' }],
      },
    ],
  },
});
