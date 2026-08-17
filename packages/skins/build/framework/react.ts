import { posix, resolve } from 'node:path';

import { resolveCatalog } from '@videojs/compiler/catalog';
import type { StylePluginOptions } from '@videojs/compiler/styles';

import type { SkinCatalog } from '../catalog';
import { createCompilerReactConfig, type ReactImportResolver } from '../compiler/react';
import { emitReactModules } from '../compiler/react-modules';
import { skinRootClassName, skinRootComponentName } from '../compiler/skin-root';
import type { GeneratedFile } from '../output/files';

interface GenerateReactSkinsOptions {
  rootDir: string;
  skin: string;
  iconSet: string;
  styles: StylePluginOptions;
  resolveImport?: ReactImportResolver | undefined;
}

/** Transform the complete canonical Skin source graph into editable React modules. */
export async function generateReactSkins(
  catalog: SkinCatalog,
  options: GenerateReactSkinsOptions
): Promise<GeneratedFile[]> {
  const skin = catalog.items.find((item) => item.name === options.skin);
  if (skin?.type !== 'skin') throw new Error(`Skin \`${options.skin}\` does not exist.`);

  const entryPath = canonicalPath(skin.source);
  const entryDir = posix.dirname(entryPath);
  const layouts = resolveCatalog(catalog, [skin.name])
    .files.source.map(canonicalPath)
    .map((path) => ({
      inputFile: resolve(options.rootDir, path),
      outputFile: path.startsWith(`${entryDir}/`) ? posix.relative(entryDir, path) : path,
    }))
    .sort((a, b) => a.outputFile.localeCompare(b.outputFile));
  const config = createCompilerReactConfig({
    styles: options.styles,
    iconSet: options.iconSet,
    rootComponentName: skinRootComponentName(skin),
    rootClassName: skinRootClassName(skin),
    ...(options.resolveImport ? { resolveImport: options.resolveImport } : {}),
  });

  const output = await emitReactModules({
    rootDir: options.rootDir,
    layouts,
    config,
    description: `React Skin \`${skin.name}\``,
  });
  return [...output.files];
}

function canonicalPath(path: string): string {
  return path.replace(/^\.\//, '');
}
