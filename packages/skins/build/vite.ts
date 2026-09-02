import { resolve } from 'node:path';

import { iconElementSourcePlugin } from '../../icons/vjsc/vite.ts';
import { vjscPlugin } from '../../vjsc/src/vite/index.ts';
import { skinMetaDefaults } from './config.ts';
import { resolveSkinComponents, resolveSkinStyles } from './transform.ts';

const packageDir = resolve(import.meta.dirname, '..');
const reactSourceDir = resolve(packageDir, '../react/src');
const htmlSourceDir = resolve(packageDir, '../html/src');

export interface SkinsSourceOptions {
  /** Register the Tailwind candidate manifest so a consumer's Tailwind entry can import `vjsc:candidates`. */
  readonly tailwind?: boolean | undefined;
  /**
   * Resolve `@videojs/react` and `@videojs/html` to workspace source for live editing, or leave them to the built
   * packages so the consumer exercises what ships.
   */
  readonly frameworks?: 'source' | 'package' | undefined;
}

/** The plugins the preset produces. Consumers spread them into their own `plugins` array. */
export type SkinsSourcePlugin = ReturnType<typeof iconElementSourcePlugin> | ReturnType<typeof vjscPlugin>[number];

export interface SkinsSourceConfig {
  readonly plugins: SkinsSourcePlugin[];
  readonly resolve: {
    readonly alias: { readonly find: RegExp; readonly replacement: string }[];
    readonly dedupe: string[];
  };
  readonly optimizeDeps: {
    /** Workspace packages and the compiler must never be prebundled; they are transformed per request. */
    readonly exclude: string[];
  };
}

/**
 * Everything a Vite app needs to compile authored skins straight from `packages/skins/src`. Consumers add their own
 * framework plugins such as `react()` or `tailwindcss()`, `define` values, and dev-only helpers.
 */
export function createSkinsSourceConfig(options: SkinsSourceOptions = {}): SkinsSourceConfig {
  const alias =
    options.frameworks === 'source'
      ? [
          { find: /^@\//, replacement: `${reactSourceDir}/` },
          { find: /^@videojs\/react(?=\/|$)/, replacement: reactSourceDir },
          { find: /^@videojs\/html\/icons\/element(?=\/|$)/, replacement: resolve(htmlSourceDir, 'icons/element') },
          { find: /^@videojs\/html\/icons(?=\/|$)/, replacement: resolve(htmlSourceDir, 'icons') },
          { find: /^@videojs\/html(?=\/|$)/, replacement: resolve(htmlSourceDir, 'define') },
        ]
      : [];

  const plugins: SkinsSourcePlugin[] = [
    iconElementSourcePlugin(),
    ...vjscPlugin({
      transform: { components: resolveSkinComponents, styles: resolveSkinStyles },
      meta: { defaults: skinMetaDefaults },
      candidates: options.tailwind === true,
    }),
  ];

  return {
    plugins,
    resolve: { alias, dedupe: ['react', 'react-dom', 'vjsc'] },
    optimizeDeps: {
      exclude: [
        'vjsc',
        'vjsc/styles',
        'vjsc/components',
        '@videojs/core',
        '@videojs/html',
        '@videojs/icons',
        '@videojs/react',
        '@videojs/spf',
        '@videojs/store',
        '@videojs/utils',
      ],
    },
  };
}
