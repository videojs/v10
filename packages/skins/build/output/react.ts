import { posix } from 'node:path';

import { jsx } from 'vjsc';
import { defineCatalogOutput, emitCatalog } from 'vjsc/catalog';
import { catalogSourcePath, getCatalogSkin, type SkinCatalog, type SkinCatalogSkin } from '../catalog';
import { createReactComponentRegistry } from '../metadata';
import { componentTransforms } from './react/transform';
import { packageSkinStyles, skinStyleTransform } from './styles';

interface ReactOutputOptions {
  iconSet?: string | undefined;
}

interface EmitReactSkinOptions extends ReactOutputOptions {
  skin: SkinCatalogSkin['name'];
}

export interface EmitReactSkinModuleOptions extends EmitReactSkinOptions {
  style: 'tailwind' | 'vanilla';
}

/** Create the React module output adapter for a Skin catalog. */
export function reactOutput(options: ReactOutputOptions = {}) {
  const iconSet = options.iconSet ?? 'default';

  return defineCatalogOutput({
    componentRegistry: createReactComponentRegistry(iconSet),
    compiler: {
      external: (source) => !source.startsWith('.') && !source.startsWith('/'),
      target: jsx({ importSource: 'react' }),
      plugins: [componentTransforms()],
    },
  });
}

/** Emit one canonical Skin as editable React modules and vanilla CSS. */
export async function emitReactSkin(catalog: SkinCatalog, options: EmitReactSkinOptions) {
  const { skin: skinName, ...outputOptions } = options;
  const skin = getCatalogSkin(catalog, skinName);
  const entryPath = catalogSourcePath(skin.source);
  const entryDir = posix.dirname(entryPath);
  const output = await emitCatalog(catalog, {
    items: [skin.name],
    output: reactOutput(outputOptions),
    styles: skinStyleTransform(catalog, skin),
    files: {
      source: ({ sourceFile }) => {
        const path = catalogSourcePath(sourceFile);

        return path.startsWith(`${entryDir}/`) ? posix.relative(entryDir, path) : path;
      },
    },
  });

  return {
    files: output.files.source,
    styles: await packageSkinStyles(catalog, skin, output.files.style),
  };
}

/** Bundle one React Skin for a virtual development or package-build entry. */
export async function emitReactSkinModule(catalog: SkinCatalog, options: EmitReactSkinModuleOptions) {
  const { skin: skinName, style, ...outputOptions } = options;
  const skin = getCatalogSkin(catalog, skinName);
  const adapter = reactOutput(outputOptions);
  const output = await emitCatalog(catalog, {
    items: [skin.name],
    output: { ...adapter, mode: 'bundle' },
    styles:
      style === 'tailwind' ? { mode: 'tailwind', variant: skin.style.variant } : skinStyleTransform(catalog, skin),
    files: {
      source: () => `.vjsc/virtual/react/${skin.name}/${style}/skin.tsx`,
    },
  });
  const bundled = output.files.source[0];

  if (output.files.source.length !== 1 || !bundled) {
    throw new Error(`React Skin module expected one output file, but received ${output.files.source.length}.`);
  }

  return {
    code: bundled.content,
    styles: style === 'vanilla' ? await packageSkinStyles(catalog, skin, output.files.style) : [],
  };
}
