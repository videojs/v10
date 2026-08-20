import { posix } from 'node:path';

import { jsx } from 'vjsc';
import type { ImportRef } from 'vjsc/ast';
import { defineCatalogOutput, emitCatalog } from 'vjsc/catalog';
import { extendRegistry } from 'vjsc/registry';
import { react as iconRegistry } from '../../../icons/vjsc';
import { registry as reactRegistry } from '../../../react/vjsc';
import { catalogSourcePath, getCatalogSkin, type SkinCatalog, type SkinCatalogSkin } from '../catalog';
import { componentTransforms } from './react/transform';
import { packageSkinStyles, skinStyleTransform } from './styles';

type ReactImportResolver = (reference: ImportRef) => ImportRef | false;

interface ReactOutputOptions {
  iconSet?: string | undefined;
  resolveImport?: ReactImportResolver | undefined;
}

interface EmitReactSkinOptions extends ReactOutputOptions {
  skin: SkinCatalogSkin['name'];
}

/** Create the React module output adapter for a Skin catalog. */
export function reactOutput(options: ReactOutputOptions = {}) {
  const resolveImport = (reference: ImportRef): ImportRef | false =>
    options.resolveImport ? options.resolveImport(reference) : reference;

  const iconSet = options.iconSet ?? 'default';
  const iconSource = iconSet === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${iconSet}`;

  return defineCatalogOutput({
    componentRegistry: extendRegistry(reactRegistry, iconRegistry({ family: iconSet })),
    compiler: {
      target: jsx({
        imports: {
          '@videojs/core': (name) => resolveImport({ source: '@videojs/core', name }),
          '@videojs/react': (name) => resolveImport({ source: '@videojs/react', name }),
          '@videojs/utils/style': (name) => resolveImport({ source: '@videojs/utils/style', name }),
          [iconSource]: (name) => resolveImport({ source: iconSource, name }),
          react: (name) => resolveImport({ source: 'react', name }),
        },
      }),
      plugins: [componentTransforms(resolveImport)],
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
