import { posix } from 'node:path';

import { jsx } from 'vjsc';
import { defineCatalogOutput, emitCatalog } from 'vjsc/catalog';
import { createReactComponentRegistry } from '../../vjsc/registry/frameworks';
import { componentTransforms } from '../../vjsc/registry/react';
import { catalogSourcePath, getCatalogSkin, type SkinCatalog, type SkinCatalogSkin } from '../catalog';
import { packageSkinStyles, skinStyleTransform } from './styles';

interface ReactOutputOptions {
  iconSet?: string | undefined;
}

interface EmitReactSkinOptions extends ReactOutputOptions {
  skin: SkinCatalogSkin['name'];
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
