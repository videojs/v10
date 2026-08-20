import { resolve } from 'node:path';
import type { VirtualModuleDefinition } from 'vjsc';
import { resolveCatalog } from 'vjsc/catalog';
import type { GeneratedModule } from 'vjsc/generate';

import skinCatalog from '../canonical/catalog';
import { loadSkinCatalog } from './catalog';
import { frameworkRegistryWatchFiles, getCoreSchemaModule, getIconSchemaModule } from './metadata';
import { emitHtmlSkin } from './output/html';
import { emitReactSkinModule } from './output/react';

export const skinFrameworks = ['react', 'html'] as const;
export const skinStyleModes = ['vanilla', 'tailwind'] as const;

export type SkinFramework = (typeof skinFrameworks)[number];
export type SkinStyleMode = (typeof skinStyleModes)[number];

export interface SkinVirtualModule extends GeneratedModule {
  readonly id: `virtual:vjsc/skin/${SkinFramework}/${string}/${SkinStyleMode}.tsx`;
}

/** Create stable Vite module identities for every canonical Skin projection. */
export function createSkinVirtualModules(): VirtualModuleDefinition[] {
  return skinCatalog.items
    .filter((item) => item.type === 'skin')
    .flatMap((skin) =>
      skinFrameworks.flatMap((framework) =>
        skinStyleModes.map((style) => {
          const id = skinVirtualModuleId(framework, skin.name, style);
          return {
            id,
            load: () => loadSkinVirtualModule(framework, skin.name, style, id),
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

async function loadSkinVirtualModule(
  framework: SkinFramework,
  skinName: string,
  style: SkinStyleMode,
  id: SkinVirtualModule['id']
): Promise<SkinVirtualModule> {
  const catalog = await loadSkinCatalog();
  const skin = catalog.items.find((item) => item.name === skinName && item.type === 'skin');
  if (skin?.type !== 'skin') throw new Error(`Virtual Skin entry \`${skinName}\` does not exist.`);

  const iconFamily = skin.style.theme;
  let code: string;
  let emittedStyles: Awaited<ReturnType<typeof emitReactSkinModule>>['styles'];
  if (framework === 'react') {
    const emitted = await emitReactSkinModule(catalog, { skin: skin.name, iconSet: iconFamily, style });
    code = emitted.code;
    emittedStyles = emitted.styles;
  } else {
    const emitted = await emitHtmlSkin(catalog, { skin: skin.name, iconSet: iconFamily, style });
    code = emitted.files[0]!.content;
    emittedStyles = emitted.styles;
  }
  const css = emittedStyles
    .filter((file) => file.path !== 'styles/styles.css')
    .map((file) => file.content)
    .join('\n');
  const resolved = resolveCatalog(catalog, [skin.name]);
  const resourceFiles = catalog.resources
    ? flattenResourceFiles(catalog.resources).map((file) => resolve(catalog.rootDir, file))
    : [];
  const metadataFiles = [
    ...getCoreSchemaModule().watchFiles,
    ...frameworkRegistryWatchFiles[framework],
    ...getIconSchemaModule(iconFamily).watchFiles,
  ];

  return {
    id,
    code: `${code}\nexport const css = ${JSON.stringify(css)};\n`,
    watchFiles: [
      ...resolved.files.source.map((file) => resolve(catalog.rootDir, file)),
      ...resolved.files.style.map((file) => resolve(catalog.rootDir, file)),
      ...resourceFiles,
      ...metadataFiles,
    ],
  };
}

function flattenResourceFiles(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flattenResourceFiles);
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(flattenResourceFiles);
}
