import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { iconElementPlugin } from '@videojs/icons/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { type CompilerConfig, html, jsx } from 'vjsc';
import { componentMetaPlugin, discoverComponents } from 'vjsc/components';
import { registryPlugin } from 'vjsc/registry';
import { shadcnPlugin } from 'vjsc/rolldown';
import { stylesPlugin } from 'vjsc/styles';
import { type VjscTransformer, vjscPlugin } from 'vjsc/vite';
import type { SkinMeta } from './vjsc/meta';
import { createHtmlComponentRegistry, createReactComponentRegistry } from './vjsc/registry/frameworks';
import { componentTransforms } from './vjsc/registry/react';
import { skinRegistry } from './vjsc/registry/shadcn';

const packageDir = import.meta.dirname;
const vjscDir = normalizePath(resolve(packageDir, 'vjsc'));
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlSourceDir = normalizePath(resolve(packageDir, '../html/src'));
const vjscInclude = new RegExp(`^${escapeRegExp(vjscDir)}/.*\\.tsx(?:\\?.*)?$`);

export default defineConfig(({ mode }) => (mode === 'registry' ? createRegistryConfig() : createPreviewConfig()));

function createRegistryConfig() {
  const transform = createSkinTransformer();

  return {
    root: packageDir,
    plugins: [
      vjscPlugin({
        cwd: packageDir,
        include: vjscInclude,
        transform,
      }),
    ],
    build: {
      outDir: resolve(packageDir, 'dist/registry'),
      emptyOutDir: true,
      rolldownOptions: {
        input: [],
        external: isPackageImport,
        plugins: [
          shadcnPlugin({
            root: vjscDir,
            include: ['./components/**/*.{ts,tsx}', './skins/*/skin.{ts,tsx}'],
            query: { framework: 'react', skin: 'default-video', style: 'tailwind' },
            registry: skinRegistry,
          }),
        ],
      },
    },
  };
}

function createPreviewConfig() {
  const transform = createSkinTransformer();

  return {
    root: resolve(packageDir, 'dev'),
    define: {
      __DEV__: 'true',
    },
    plugins: [
      iconElementPlugin(),
      vjscPlugin({
        cwd: packageDir,
        include: vjscInclude,
        transform,
      }),
      tailwindcss(),
      react({ jsxImportSource: 'react' }),
    ],
    resolve: {
      alias: [
        {
          find: /^virtual:vjsc\/skin\/(react|html)\/([^/]+)\/(vanilla|tailwind)\.tsx$/,
          replacement: `${vjscDir}/skins/$2/skin.tsx?framework=$1&skin=$2&style=$3`,
        },
        { find: /^@videojs\/react$/, replacement: resolve(reactSourceDir, 'index.ts') },
        {
          find: /^@videojs\/react\/icons$/,
          replacement: resolve(reactSourceDir, 'icons/index.ts'),
        },
        {
          find: /^@videojs\/react\/icons\/(.+)$/,
          replacement: `${reactSourceDir}/icons/$1/index.ts`,
        },
        {
          find: /^@videojs\/react\/video$/,
          replacement: resolve(reactSourceDir, 'presets/video/index.ts'),
        },
        { find: /^@\//, replacement: `${reactSourceDir}/` },
        { find: /^@videojs\/html\/i18n$/, replacement: resolve(htmlSourceDir, 'define/i18n.ts') },
        {
          find: /^@videojs\/html\/ui\/(.+)$/,
          replacement: `${htmlSourceDir}/define/ui/$1.ts`,
        },
        {
          find: /^@videojs\/html\/media\/(.+)$/,
          replacement: `${htmlSourceDir}/define/media/$1.ts`,
        },
        {
          find: /^@videojs\/html\/icons\/element$/,
          replacement: resolve(htmlSourceDir, 'icons/element/index.ts'),
        },
        {
          find: /^@videojs\/html\/icons\/element\/(.+)$/,
          replacement: `${htmlSourceDir}/icons/element/$1/index.ts`,
        },
      ],
      conditions: ['development', 'import', 'module', 'browser', 'default'],
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['vjsc', 'vjsc/styles', '@videojs/core', '@videojs/icons', '@videojs/react', '@videojs/utils'],
    },
  };
}

function createSkinTransformer(): VjscTransformer {
  const transforms = new Map<string, CompilerConfig>();
  const skins = discoverComponents<SkinMeta>({ rootDir: vjscDir, include: './skins/*/skin.tsx' });

  return ({ parameters }) => {
    const framework = parameters.get('framework');
    const skinName = parameters.get('skin');
    const style = parameters.get('style');
    if ((framework !== 'react' && framework !== 'html') || !skinName || !style) return null;

    const skin = skins.find((item) => item.name === skinName);
    if (!skin) return null;

    const key = parameters.toString();
    const cached = transforms.get(key);
    if (cached) return cached;

    const registry =
      framework === 'react'
        ? createReactComponentRegistry(skin.style.theme)
        : createHtmlComponentRegistry(skin.style.theme);
    const config: CompilerConfig = {
      target: framework === 'react' ? jsx({ importSource: 'react' }) : html(),
      plugins: [
        registryPlugin(registry),
        style === 'tailwind'
          ? stylesPlugin({ mode: 'tailwind', variant: skin.style.variant })
          : stylesPlugin({
              mode: 'css',
              variant: skin.style.variant,
              stylesheet: {
                input: resolve(vjscDir, 'styles/tailwind.css'),
                scope: `.${skin.style.scope}`,
              },
            }),
        componentMetaPlugin(),
        ...(framework === 'react' ? [componentTransforms()] : []),
      ],
    };
    transforms.set(key, config);
    return config;
  };
}

function isPackageImport(id: string): boolean {
  return !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
