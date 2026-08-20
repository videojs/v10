import { basename, resolve } from 'node:path';

import { defineConfig } from 'tsdown';
import { shadcnPlugin, vjscPlugin } from 'vjsc/rolldown';

import { baseConfig } from '../../build/tsdown.ts';
import type { SkinModuleMeta } from './vjsc/meta';
import { createSkinTransformer } from './vjsc/transform';

const packageDir = import.meta.dirname;
const vjscDir = resolve(packageDir, 'vjsc');
const registryUtils = resolve(vjscDir, 'registry/utils.ts');
const sourceFilter = new RegExp(`^${escapeRegExp(vjscDir)}/.*\\.[cm]?[jt]sx?(?:\\?.*)?$`);
const paths = {
  output: 'vjsc/registry',
  source: 'default',
  install: 'components/videojs',
  import: '@/components/videojs',
} as const;

export default defineConfig({
  ...baseConfig,
  name: 'skins-shadcn-registry',
  cwd: packageDir,
  entry: { registry: registryUtils },
  outDir: 'dist/registry',
  clean: true,
  dts: false,
  sourcemap: false,
  platform: 'browser',
  format: 'es',
  alias: {
    '@videojs/skins/registry': registryUtils,
    '@videojs/utils/style': registryUtils,
  },
  deps: {
    neverBundle: true,
    alwaysBundle: ['@videojs/skins/registry', '@videojs/utils/style'],
    onlyBundle: false,
  },
  plugins: [
    vjscPlugin({ cwd: packageDir, include: sourceFilter, transform: createSkinTransformer() }),
    shadcnPlugin<SkinModuleMeta>({
      root: vjscDir,
      include: ['./components/**/*.{ts,tsx}', './skins/*/skin.{ts,tsx}', './registry/utils.ts'],
      variants: [
        {
          name: 'default',
          include: ['./components/**/*.{ts,tsx}', './skins/default-video/skin.{ts,tsx}'],
          parameters: { framework: 'react', skin: 'default-video', style: 'tailwind' },
        },
        {
          name: 'minimal',
          include: ['./components/**/*.{ts,tsx}', './skins/minimal-video/skin.{ts,tsx}'],
          parameters: { framework: 'react', skin: 'minimal-video', style: 'tailwind' },
        },
      ],
      name: 'videojs',
      homepage: 'https://videojs.org',
      namespace: '@videojs',
      paths,
      meta: { framework: 'react', style: 'tailwind' },
      item: ({ filename, meta, variant }) => {
        if (filename === registryUtils) {
          return {
            name: 'utils',
            type: 'registry:lib',
            title: 'Video.js Utilities',
            description: 'Class-name composition and state resolution utilities used by editable Video.js components.',
            filename: 'utils.ts',
          };
        }
        if (!meta) return null;
        return {
          name: meta.type === 'skin' || variant?.name === 'default' ? meta.name : `${meta.name}-${variant?.name}`,
          type: meta.type === 'skin' ? 'registry:block' : 'registry:component',
          title: variant?.name === 'minimal' && meta.type !== 'skin' ? `${meta.title} (Minimal)` : meta.title,
          description: meta.description,
          filename: basename(filename),
          meta: variant ? { variant: variant.name } : undefined,
        };
      },
      styles: {
        input: './styles/tailwind.registry.css',
        filename: 'tailwind.css',
        title: 'Video.js Skin Styles',
        description: 'Shared Tailwind input, base behavior, and Default and Minimal video themes.',
      },
    }),
  ],
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
