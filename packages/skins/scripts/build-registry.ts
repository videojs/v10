import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { syncGeneratedFiles } from 'vjsc/generate';
import { createShadcnRegistryFiles, emitShadcnRegistry } from 'vjsc/shadcn';

import { loadSkinCatalog, skinsPackageRoot } from '../build/catalog';
import { reactOutput } from '../build/output/react';
import { skinRegistry } from '../canonical/registry/shadcn';
import { formatGeneratedFile } from './generation/format';

/** Materialize the editable React/Tailwind registry, which is itself a delivery product. */
export async function buildRegistry(): Promise<void> {
  const output = await emitShadcnRegistry(await loadSkinCatalog(), skinRegistry, {
    output: reactOutput({
      resolveImport(reference) {
        if (reference.source === '@videojs/utils/style' || reference.source === '@videojs/skins/registry') {
          return { ...reference, source: `${skinRegistry.paths.import}/utils` };
        }

        return reference;
      },
    }),
    styles: {
      mode: 'tailwind',
      variant: 'default',
    },
  });

  await syncGeneratedFiles({
    rootDir: skinsPackageRoot,
    managedRoots: ['dist/registry'],
    files: createShadcnRegistryFiles(output, skinRegistry).map((file) => ({
      ...file,
      path: posix.join('dist/registry', file.path),
    })),
    format: formatGeneratedFile,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildRegistry();
}
