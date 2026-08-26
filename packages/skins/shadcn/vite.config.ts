import { basename, resolve } from 'node:path';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { baseConfig } from '../../../build/pack.ts';
// Vite+ loads this config before it can schedule builds, so bootstrap the private compiler from source.
import { shadcnPlugin, vjscPlugin } from '../../vjsc/src/plugins/index.ts';
import type { ShadcnItem } from '../../vjsc/src/shadcn/index.ts';
import { configureSkinModule } from '../vjsc/config';
import { type SkinModuleMeta, skinStyles } from '../vjsc/meta';

const packageDir = resolve(import.meta.dirname, '..');
const vjscDir = resolve(packageDir, 'vjsc');
const registryUtils = resolve(vjscDir, 'utils.ts');
const registryPaths = {
  output: 'vjsc/registry',
  source: 'default',
  install: 'components/videojs',
  import: '@/components/videojs',
} as const;

export const shadcnPackConfig: PackUserConfig = {
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
    vjscPlugin({ configure: configureSkinModule }),
    shadcnPlugin<SkinModuleMeta>({
      root: vjscDir,
      include: ['./components/**/*.{ts,tsx}', './skins/**/*.{ts,tsx}', './styles/**/*.ts', './utils.ts'],
      name: 'videojs',
      homepage: 'https://videojs.org',
      namespace: '@videojs',
      paths: registryPaths,
      meta: {
        framework: 'react',
        style: 'tailwind',
      },
      publish: {
        modules: (module) => {
          if (module.filename === registryUtils) return [{}];

          const skins = Object.keys(skinStyles);
          const ownedSkin = skins.find((name) => module.filename.includes(`/skins/${name}/skin.`));
          const selected = ownedSkin ? [ownedSkin] : skins;

          return selected.map((skin) => ({
            target: 'react',
            skin,
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
        input: './styles/tailwind.css',
        filename: 'tailwind.css',
        title: 'Video.js Skin Styles',
        description: 'Shared Tailwind input, base behavior, and Default and Minimal video themes.',
      },
    }),
  ],
};

export default defineConfig({
  pack: shadcnPackConfig,
});
