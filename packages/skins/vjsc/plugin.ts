import { resolve } from 'node:path';

import { html, jsx } from 'vjsc';
import { type VjscProjectionContext, type VjscTransformConfig, vjscPlugin } from 'vjsc/bundle';
import { catalogMetaPlugin } from 'vjsc/catalog';
import { plugin as stylesPlugin } from 'vjsc/styles';

import skinCatalog from './catalog';
import { createIconElementModule } from './icons';
import { createSkinVirtualModules } from './modules';
import { createHtmlComponentRegistry, createReactComponentRegistry } from './registry/frameworks';
import { componentTransforms } from './registry/react';

const vjscDir = import.meta.dirname;
const packageDir = resolve(vjscDir, '..');

/** Configure the source projections used by the Skins Vite development server. */
export function createSkinVjscPlugin() {
  const defaultIconElementModule = createIconElementModule('default');
  const minimalIconElementModule = createIconElementModule('minimal');

  return vjscPlugin({
    cwd: packageDir,
    include: new RegExp(`^${escapeRegExp(vjscDir)}/.*\\.tsx(?:\\?.*)?$`),
    modules: [
      { id: 'virtual:vjsc/icons/element/default.js' as const, load: () => defaultIconElementModule },
      { id: 'virtual:vjsc/icons/element/minimal.js' as const, load: () => minimalIconElementModule },
      ...createSkinVirtualModules(skinCatalog, vjscDir),
    ],
    projections: {
      react: createSkinProjection('react'),
      html: createSkinProjection('html'),
    },
  });
}

function createSkinProjection(framework: 'react' | 'html') {
  const cache = new Map<string, VjscTransformConfig>();

  return ({ parameters }: VjscProjectionContext): VjscTransformConfig => {
    const key = parameters.toString();
    const cached = cache.get(key);
    if (cached) return cached;

    const icon = parameters.get('icon') ?? 'default';
    const style = parameters.get('style') ?? 'vanilla';
    const variant = parameters.get('variant') ?? undefined;
    const scope = parameters.get('scope');
    const config: VjscTransformConfig = {
      target: framework === 'react' ? jsx({ importSource: 'react' }) : html(),
      registry: framework === 'react' ? createReactComponentRegistry(icon) : createHtmlComponentRegistry(icon),
      plugins: [
        style === 'tailwind'
          ? stylesPlugin({ mode: 'tailwind', ...(variant ? { variant } : {}) })
          : stylesPlugin({
              mode: 'css',
              ...(variant ? { variant } : {}),
              emit: {
                input: resolve(vjscDir, 'styles/tailwind.css'),
                ...(scope ? { scope: `.${scope}` } : {}),
              },
            }),
        catalogMetaPlugin(),
        ...(framework === 'react' ? [componentTransforms()] : []),
      ],
    };
    cache.set(key, config);
    return config;
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
