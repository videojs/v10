import { basename, resolve } from 'node:path';

import { defineConfig } from 'tsdown';
import { shadcnPlugin, vjscPlugin } from 'vjsc/rolldown';
import type { ShadcnItem } from 'vjsc/shadcn';

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
  report: process.env.CI === 'true',
  name: 'skins-shadcn-registry',
  cwd: packageDir,
  entry: {
    registry: registryUtils,
  },
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
    vjscPlugin({
      cwd: packageDir,
      include: sourceFilter,
      isVjscModule: ({ parameters }) => parameters.has('framework'),
      transform: createSkinTransformer(),
    }),
    shadcnPlugin<SkinModuleMeta>({
      root: vjscDir,
      include: ['./components/**/*.{ts,tsx}', './skins/*/skin.{ts,tsx}', './registry/utils.ts'],
      name: 'videojs',
      homepage: 'https://videojs.org',
      namespace: '@videojs',
      paths,
      meta: {
        framework: 'react',
        style: 'tailwind',
      },
      publish: {
        modules: (module, modules) => {
          if (module.filename === registryUtils) return [{}];

          const skins = modules.flatMap(({ meta }) => (meta?.type === 'skin' ? [meta] : []));

          const selected =
            module.meta?.type === 'skin' ? skins.filter((skin) => skin.name === module.meta?.name) : skins;

          return selected.map((skin) => ({
            framework: 'react',
            skin: skin.name,
            style: 'tailwind',
          }));
        },
        items: (modules) =>
          modules.flatMap<ShadcnItem<SkinModuleMeta>>((module) => {
            const { filename, meta, transform } = module;

            if (filename === registryUtils) {
              return [
                {
                  module,
                  name: 'utils',
                  type: 'registry:lib',
                  title: 'Video.js Utilities',
                  description:
                    'Class-name composition and state resolution utilities used by editable Video.js components.',
                  filename: 'utils.ts',
                },
              ];
            }

            if (!meta) return [];

            const skinName = transform.skin;

            const skin = modules.find(
              (candidate) => candidate.meta?.type === 'skin' && candidate.meta.name === skinName
            )?.meta;

            if (skin?.type !== 'skin') throw new Error(`Unknown skin: \`${skinName}\`.`);

            const variant = skin.style.variant;

            return [
              {
                module,
                name: meta.type === 'skin' || skin.style.theme === 'default' ? meta.name : `${meta.name}-${variant}`,
                type: meta.type === 'skin' ? 'registry:block' : 'registry:component',
                title: skin.style.theme === 'minimal' && meta.type !== 'skin' ? `${meta.title} (Minimal)` : meta.title,
                description: meta.description,
                filename: basename(filename),
                meta: { variant },
              },
            ];
          }),
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
