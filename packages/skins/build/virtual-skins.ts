import { resolve } from 'node:path';

import type { VirtualModuleDefinition, VjscModule } from 'vjsc/bundle';

import type skinCatalog from '../vjsc/catalog';

export const skinFrameworks = ['react', 'html'] as const;
export const skinStyleModes = ['vanilla', 'tailwind'] as const;

export type SkinFramework = (typeof skinFrameworks)[number];
export type SkinStyleMode = (typeof skinStyleModes)[number];

export interface SkinVirtualModule extends VjscModule {
  readonly id: `virtual:vjsc/skin/${SkinFramework}/${string}/${SkinStyleMode}.tsx`;
}

/** Create stable catalog entry facades backed by the real VJSC source graph. */
export function createSkinVirtualModules(definition: typeof skinCatalog, rootDir: string): VirtualModuleDefinition[] {
  return definition.items
    .filter((item) => item.type === 'skin')
    .flatMap((skin) =>
      skinFrameworks.flatMap((framework) =>
        skinStyleModes.map((style) => {
          const id = skinVirtualModuleId(framework, skin.name, style);
          return {
            id,
            load: () => createSkinFacade(framework, style, skin, resolve(rootDir, skin.source), id),
          };
        })
      )
    );
}

export function skinVirtualModuleId(
  framework: SkinFramework,
  skin: string,
  style: SkinStyleMode
): SkinVirtualModule['id'] {
  return `virtual:vjsc/skin/${framework}/${skin}/${style}.tsx`;
}

function createSkinFacade(
  framework: SkinFramework,
  style: SkinStyleMode,
  skin: Extract<(typeof skinCatalog.items)[number], { readonly type: 'skin' }>,
  source: string,
  id: SkinVirtualModule['id']
): SkinVirtualModule {
  const parameters = new URLSearchParams({
    framework,
    icon: skin.style.theme,
    scope: skin.style.scope,
    style,
    variant: skin.style.variant,
  });
  const projectedSource = `${source}?${parameters}`;
  const code =
    framework === 'react'
      ? `export * from ${JSON.stringify(projectedSource)};\n`
      : `import { ${skinExportName(skin.name)} as Skin } from ${JSON.stringify(projectedSource)};\nexport const skin = String(Skin({}));\n`;

  return { id, code, watchFiles: [source] };
}

function skinExportName(name: string): string {
  return `${name.replace(/(^|-)([a-z])/g, (_match, _separator, letter: string) => letter.toUpperCase())}Skin`;
}
