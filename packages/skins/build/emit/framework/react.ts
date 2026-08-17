import { posix } from 'node:path';

import { type CatalogOutputFile, emitCatalog, resolveCatalog } from '@videojs/compiler/catalog';
import type { StylePluginOptions } from '@videojs/compiler/styles';

import { type SkinCatalog, type SkinCatalogItem, skinRootClassName, skinRootComponentName } from '../../catalog';
import { createCompilerReactConfig, type ReactImportResolver } from '../../transform/react';

interface GenerateReactSkinsOptions {
  skin: SkinCatalogItem['name'];
  iconSet: string;
  styles: StylePluginOptions;
  resolveImport?: ReactImportResolver | undefined;
}

/** Transform the complete canonical Skin source graph into editable React modules. */
export async function generateReactSkins(
  catalog: SkinCatalog,
  options: GenerateReactSkinsOptions
): Promise<CatalogOutputFile[]> {
  const skin = catalog.items.find((item) => item.name === options.skin);
  if (skin?.type !== 'skin') throw new Error(`Skin \`${options.skin}\` does not exist.`);

  const entryPath = canonicalPath(skin.source);
  const entryDir = posix.dirname(entryPath);
  const resolved = resolveCatalog(catalog, [skin.name]);
  const config = createCompilerReactConfig({
    styles: options.styles,
    iconSet: options.iconSet,
    rootComponentName: skinRootComponentName(skin),
    rootClassName: skinRootClassName(skin),
    ...(options.resolveImport ? { resolveImport: options.resolveImport } : {}),
  });

  const output = await emitCatalog(catalog, {
    items: resolved.items.map((item) => item.name),
    compiler: {
      config: () => config,
    },
    resolve: {
      file: ({ sourceFile }) => {
        const path = canonicalPath(sourceFile);

        return path.startsWith(`${entryDir}/`) ? posix.relative(entryDir, path) : path;
      },
    },
  });

  return resolved.items
    .flatMap((item) => output.items[item.name]?.files ?? [])
    .sort((a, b) => a.path.localeCompare(b.path));
}

function canonicalPath(path: string): string {
  return path.replace(/^\.\//, '');
}
