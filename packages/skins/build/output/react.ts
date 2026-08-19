import { jsx } from 'vjsc';
import type { ImportRef } from 'vjsc/ast';
import { defineOutput, type StaticCatalogOutputAdapter } from 'vjsc/catalog';
import { extendRegistry } from 'vjsc/components';
import { registry as iconRegistry } from '../../../icons/vjsc/react';
import { registry as reactRegistry } from '../../../react/vjsc';
import { componentTransforms } from './react/transform';

export type ReactImportResolver = (reference: ImportRef) => ImportRef | false;

interface ReactOutputOptions {
  iconSet?: string | undefined;
  resolveImport?: ReactImportResolver | undefined;
}

/** Create the React module output adapter for a Skin catalog. */
export function reactOutput(options: ReactOutputOptions = {}): StaticCatalogOutputAdapter {
  const resolveImport = (reference: ImportRef): ImportRef | false =>
    options.resolveImport ? options.resolveImport(reference) : reference;

  const iconSet = options.iconSet ?? 'default';
  const iconSource = iconSet === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${iconSet}`;

  return defineOutput({
    registry: extendRegistry(reactRegistry, iconRegistry({ family: iconSet })),
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
