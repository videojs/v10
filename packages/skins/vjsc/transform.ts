import { resolve } from 'node:path';

import { type CompilerConfig, html, jsx } from 'vjsc';
import { componentMetaPlugin, discoverComponents } from 'vjsc/components';
import { registryPlugin } from 'vjsc/registry';
import { stylesPlugin } from 'vjsc/styles';
import type { VjscTransformer } from 'vjsc/vite';

import type { SkinMeta } from './meta';
import { createHtmlComponentRegistry, createReactComponentRegistry } from './registry/frameworks';
import { componentTransforms } from './registry/react';

export interface SkinConfig {
  readonly framework: 'html' | 'react';
  readonly skin: string;
  readonly style: 'tailwind' | 'vanilla';
}

export function createSkinCompilerConfig(config: SkinConfig): CompilerConfig {
  const vjscDir = import.meta.dirname;

  const skins = discoverComponents<SkinMeta>({
    rootDir: vjscDir,
    include: './skins/*/skin.tsx',
  });

  const skin = skins.find((item) => item.name === config.skin);
  if (!skin) throw new Error(`Unknown VJSC skin: \`${config.skin}\`.`);

  const registry =
    config.framework === 'react'
      ? createReactComponentRegistry(skin.style.theme)
      : createHtmlComponentRegistry(skin.style.theme);

  return {
    target: config.framework === 'react' ? jsx({ importSource: 'react' }) : html(),
    plugins: [
      registryPlugin(registry),
      config.style === 'tailwind'
        ? stylesPlugin({
            mode: 'tailwind',
            variant: skin.style.variant,
          })
        : stylesPlugin({
            mode: 'css',
            variant: skin.style.variant,
            stylesheet: {
              input: resolve(vjscDir, 'styles/tailwind.css'),
              scope: `.${skin.style.scope}`,
            },
          }),
      componentMetaPlugin(),
      ...(config.framework === 'react' ? [componentTransforms()] : []),
    ],
  };
}

export function createSkinTransformer(): VjscTransformer {
  const transforms = new Map<string, CompilerConfig>();

  return ({ parameters }): CompilerConfig | null => {
    const framework = parameters.get('framework');
    const skin = parameters.get('skin');
    const style = parameters.get('style');

    if ((framework !== 'react' && framework !== 'html') || !skin || (style !== 'tailwind' && style !== 'vanilla')) {
      return null;
    }

    const key = parameters.toString();

    const cached = transforms.get(key);
    if (cached) return cached;

    const config = createSkinCompilerConfig({ framework, skin, style });

    transforms.set(key, config);

    return config;
  };
}
