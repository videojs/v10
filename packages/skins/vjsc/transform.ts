import { resolve } from 'node:path';

import { type CompilerModule, type CompilerPlugin, jsx, parseModuleId } from 'vjsc';
import { componentMetaPlugin } from 'vjsc/components';
import { registryPlugin } from 'vjsc/registry';
import { stylesPlugin } from 'vjsc/styles';

import { type SkinName, skinStyles } from './meta';
import { createHtmlComponentRegistry, createReactComponentRegistry } from './registry/frameworks';
import { componentTransforms } from './registry/react';

export interface SkinConfig {
  readonly framework: 'html' | 'react';
  readonly skin: SkinName;
  readonly style: 'tailwind' | 'vanilla';
}

/** Return whether a query identifies a complete Skin compiler projection. */
export function isSkinModule(parameters: URLSearchParams): boolean {
  return readSkinConfig(parameters) !== null;
}

/** Create the fixed compiler pipeline used by Vite and the dedicated registry build. */
export function createSkinPlugins(): readonly CompilerPlugin[] {
  const vjscDir = import.meta.dirname;
  const reactRegistries = new Map<string, ReturnType<typeof createReactComponentRegistry>>();
  const htmlRegistries = new Map<string, ReturnType<typeof createHtmlComponentRegistry>>();
  const reactTransforms = componentTransforms();

  return [
    stylesPlugin((module) => {
      const config = moduleConfig(module);
      if (!config) return null;
      const skin = skinStyles[config.skin];

      return config.style === 'tailwind'
        ? { mode: 'tailwind', variant: skin.variant }
        : {
            mode: 'css',
            variant: skin.variant,
            stylesheet: {
              input: resolve(vjscDir, 'styles/tailwind.css'),
              scope: `.${skin.scope}`,
            },
          };
    }),
    componentMetaPlugin(),
    {
      name: 'videojs:react-components',
      transform(module, context) {
        if (moduleConfig(module)?.framework !== 'react') return null;
        return reactTransforms.transform?.(module, context) ?? null;
      },
    },
    registryPlugin({
      registries: [
        (module) => {
          const config = moduleConfig(module);
          if (config?.framework !== 'react') return null;
          const theme = skinStyles[config.skin].theme;
          let registry = reactRegistries.get(theme);
          if (!registry) {
            registry = createReactComponentRegistry(theme);
            reactRegistries.set(theme, registry);
          }
          return registry;
        },
        (module) => {
          const config = moduleConfig(module);
          if (config?.framework !== 'html') return null;
          const theme = skinStyles[config.skin].theme;
          let registry = htmlRegistries.get(theme);
          if (!registry) {
            registry = createHtmlComponentRegistry(theme);
            htmlRegistries.set(theme, registry);
          }
          return registry;
        },
      ],
    }),
    jsx({
      importSource(module) {
        const framework = moduleConfig(module)?.framework;
        if (framework === 'react') return 'react';
        if (framework === 'html') return 'vjsc/html-runtime';
        return null;
      },
    }),
  ];
}

function moduleConfig(module: CompilerModule): SkinConfig | null {
  return readSkinConfig(parseModuleId(module.id).parameters);
}

function readSkinConfig(parameters: URLSearchParams): SkinConfig | null {
  const framework = parameters.get('framework');
  const skin = parameters.get('skin');
  const style = parameters.get('style');

  if (
    (framework !== 'react' && framework !== 'html') ||
    !skin ||
    !(skin in skinStyles) ||
    (style !== 'tailwind' && style !== 'vanilla')
  ) {
    return null;
  }

  return {
    framework,
    skin: skin as SkinName,
    style,
  };
}
