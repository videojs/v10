import { basename, resolve } from 'node:path';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { baseConfig } from '../../../build/pack.ts';
// Vite+ loads this config before it can schedule builds, so bootstrap the private compiler from source.
import { shadcnPlugin, vjscPlugin } from '../../vjsc/src/plugins/index.ts';
import type { ShadcnItem } from '../../vjsc/src/shadcn/index.ts';
import { registryCatalog } from '../registry/catalog.ts';
import type { VideojsRegistryMeta } from '../registry/meta.ts';
import { configureSkinModule } from '../vjsc/config';
import { type SkinModuleMeta, type SkinName, skinStyles } from '../vjsc/meta';

const packageDir = resolve(import.meta.dirname, '..');
const vjscDir = resolve(packageDir, 'vjsc');
const registryUtils = resolve(vjscDir, 'utils.ts');
const registryPaths = {
  install: 'components/videojs',
  import: '@/components/videojs',
} as const;
const publishedSkins = Object.keys(skinStyles).filter(isSkinName);
const frameworks = ['react', 'html'] as const;
const stylingOptions = ['tailwind', 'css'] as const;
const privateComponents = new Set(['button-tooltip']);
const audioComponents = new Set(['audio-play-button', 'audio-settings-menu', 'audio-time-slider']);
const liveAudioComponents = new Set(['live-playback-hotkeys']);
const liveVideoComponents = new Set(['captions-menu', 'live-button', 'live-video-gestures', 'live-video-hotkeys']);

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
      packages: {
        '@videojs/html': '@videojs/html@10.0.0-beta.32',
        '@videojs/react': '@videojs/react@10.0.0-beta.32',
      },
      items: registryCatalog(),
      publish: {
        modules: (module) => {
          if (module.filename === registryUtils) return [{}];

          const ownedSkin = publishedSkins.find((name) => module.filename.includes(`/skins/${name}/`));
          const selected = ownedSkin ? [ownedSkin] : publishedSkins;

          return selected.flatMap((skin) =>
            frameworks.flatMap((target) => stylingOptions.map((style) => ({ target, skin, style })))
          );
        },
        items: (modules) =>
          modules.flatMap<ShadcnItem<SkinModuleMeta>>((module) => {
            const { filename, meta, transform } = module;

            if (filename === registryUtils) {
              const itemMeta = {
                role: 'support',
                framework: 'react',
                styling: 'tailwind',
                public: false,
              } satisfies VideojsRegistryMeta;

              return [
                {
                  module,
                  name: 'react-utils',
                  group: 'shared',
                  type: 'registry:lib',
                  title: 'Video.js Utilities',
                  description:
                    'Class-name composition and state resolution utilities used by editable Video.js components.',
                  filename: 'utils.ts',
                  target: 'utils.ts',
                  meta: itemMeta,
                },
              ];
            }

            if (!meta) return [];

            if (meta.type === 'skin') {
              if (!isSkinName(meta.name) || !publishedSkins.includes(meta.name)) return [];

              const preset = presetForSkin(meta.name);
              const variant = meta.style.theme;
              const framework = transform.target;
              const styling = transform.style;
              if (!isFramework(framework) || !isStyling(styling)) return [];

              const suffix = itemSuffix(variant, styling);
              const directory = `${preset}${suffix}`;
              const itemMeta = {
                role: 'skin',
                framework,
                styling,
                preset,
                media: preset.endsWith('audio') ? 'audio' : 'video',
                variant,
                public: true,
              } satisfies VideojsRegistryMeta;

              return [
                {
                  module,
                  name: `${framework}-${preset}-skin${suffix}`,
                  group: `${framework}/skins`,
                  type: 'registry:block',
                  title: meta.title,
                  description: meta.description,
                  filename: basename(filename),
                  target: `skins/${directory}/skin.tsx`,
                  ...(styling === 'css'
                    ? {
                        styles: false,
                        stylesheet: {
                          target: `skins/${directory}/skin.css`,
                          files: ['./styles/base.css'],
                          import: true,
                        },
                      }
                    : {}),
                  meta: itemMeta,
                },
              ];
            }

            if (transform.target !== 'react' || transform.style !== 'tailwind') return [];

            if (privateComponents.has(meta.name)) return [];

            const skinName = transform.skin;
            if (!isSkinName(skinName)) throw new Error(`Unknown skin: \`${skinName}\`.`);

            const selected = componentSkins(meta.name);
            if (!selected.includes(skinName)) return [];

            const variant = skinStyles[skinName].theme;
            const suffix = variant === 'minimal' ? '-minimal' : '';
            const itemMeta = {
              role: 'component',
              framework: 'react',
              styling: 'tailwind',
              variant,
              public: true,
            } satisfies VideojsRegistryMeta;

            return [
              {
                module,
                name: `react-${meta.name}${suffix}`,
                group: 'react/components',
                type: 'registry:component',
                title: variant === 'minimal' ? `${meta.title} (Minimal)` : meta.title,
                description: meta.description,
                filename: basename(filename),
                target: `ui/${meta.name}${suffix}.tsx`,
                meta: itemMeta,
              },
            ];
          }),
      },
      styles: {
        input: './styles/tailwind.css',
        name: 'tailwind-styles',
        group: 'shared',
        target: 'styles/tailwind.css',
        filename: 'tailwind.css',
        title: 'Video.js Skin Styles',
        description: 'Shared Tailwind input and Video.js skin theme sources.',
        meta: {
          role: 'support',
          framework: 'react',
          styling: 'tailwind',
          public: false,
        } satisfies VideojsRegistryMeta,
      },
    }),
  ],
};

export default defineConfig({
  pack: shadcnPackConfig,
});

function componentSkins(name: string): readonly SkinName[] {
  if (audioComponents.has(name)) return ['default-audio', 'minimal-audio'];

  if (liveAudioComponents.has(name)) return ['default-live-audio', 'minimal-live-audio'];

  if (liveVideoComponents.has(name)) return ['default-live-video', 'minimal-live-video'];

  return ['default-video', 'minimal-video'];
}

function isSkinName(value: string | undefined): value is SkinName {
  return Boolean(value && value in skinStyles);
}

function presetForSkin(skin: SkinName): NonNullable<VideojsRegistryMeta['preset']> {
  return skin.replace(/^(?:default|minimal)-/, '') as NonNullable<VideojsRegistryMeta['preset']>;
}

function isFramework(value: string | undefined): value is (typeof frameworks)[number] {
  return value === 'react' || value === 'html';
}

function isStyling(value: string | undefined): value is (typeof stylingOptions)[number] {
  return value === 'tailwind' || value === 'css';
}

function itemSuffix(variant: VideojsRegistryMeta['variant'], styling: VideojsRegistryMeta['styling']): string {
  return `${variant === 'minimal' ? '-minimal' : ''}${styling === 'css' ? '-css' : ''}`;
}
