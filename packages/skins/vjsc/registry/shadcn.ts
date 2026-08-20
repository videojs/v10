import { resolve } from 'node:path';

import { jsx } from 'vjsc';
import { defineShadcnRegistry, defineShadcnSource, type ShadcnPlugin, shadcnPlugin } from 'vjsc/shadcn';

import type { SkinModuleMeta } from '../meta';
import { createReactComponentRegistry } from './frameworks';
import { componentTransforms } from './react';

const paths = {
  output: 'vjsc/registry',
  source: 'default',
  install: 'components/videojs',
  import: '@/components/videojs',
} as const;

const rootDir = resolve(import.meta.dirname, '..');
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

const skinSource = defineShadcnSource<SkinModuleMeta>()({
  discovery: {
    rootDir,
    include: ['./components/**/*.tsx', './skins/*/skin.tsx'],
  },
  resources: { styles },
  allowedImports: [
    '@videojs/core',
    '@videojs/utils/style',
    'vjsc',
    'vjsc/styles',
    'vjsc/components',
    /^@videojs\/core\/i18n\/text\//,
  ],
  imports: {
    '@videojs/core/vjsc': 'components',
    '@videojs/icons/vjsc': 'icons',
  },
});

/** React/Tailwind publication policy for the canonical Skin inventory. */
const skinRegistry = defineShadcnRegistry(skinSource, {
  name: 'videojs',
  homepage: 'https://videojs.org',
  namespace: '@videojs',
  paths,
  imports: {
    '@videojs/skins/registry': `${paths.import}/utils`,
    '@videojs/utils/style': `${paths.import}/utils`,
  },
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

/** Configure the Shadcn source-distribution output consumed by the Skins Vite build. */
export function createSkinShadcnPlugin(): ShadcnPlugin {
  return shadcnPlugin({
    source: skinSource,
    rootDir,
    registry: skinRegistry,
    transformer: {
      componentRegistry: createReactComponentRegistry(),
      transform: {
        target: jsx({ importSource: 'react' }),
        plugins: [componentTransforms()],
      },
    },
    styles: {
      mode: 'tailwind',
      variant: 'default',
    },
  });
}
