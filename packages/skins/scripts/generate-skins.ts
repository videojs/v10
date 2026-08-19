import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type GeneratedFile, syncGeneratedFiles } from 'vjsc/generate';
import { emitShadcnRegistry } from 'vjsc/shadcn';
import { resolvePackageImport as resolveHtmlPackageImport } from '../../html/vjsc';
import { resolvePackageImport as resolveReactPackageImport } from '../../react/vjsc';

import { loadSkinCatalog, skinsPackageRoot } from '../build/catalog';
import { emitHtmlSkin } from '../build/output/html';
import { emitReactSkin, reactOutput } from '../build/output/react';
import { skinRegistry } from '../canonical/registry/shadcn';
import { formatGeneratedFile } from './generation/format';

export interface GenerateSkinsOptions {
  check?: boolean | undefined;
}

const frameworkSkins = [
  { name: 'default-video', iconSet: 'default' },
  { name: 'minimal-video', iconSet: 'minimal' },
] as const;

const frameworkPackages = {
  html: resolve(skinsPackageRoot, '../html'),
  react: resolve(skinsPackageRoot, '../react'),
} as const;

/** Generate framework Skins and the contained React/Tailwind registry. */
export async function generateSkins(options: GenerateSkinsOptions = {}): Promise<void> {
  const catalog = await loadSkinCatalog();

  for (const skin of frameworkSkins) {
    const outputDir = `src/__generated__/skins/${skin.name}`;
    const [html, react] = await Promise.all([
      emitHtmlSkin(catalog, {
        skin: skin.name,
        iconSet: skin.iconSet,
        resolveImport: (specifier) => resolveHtmlPackageImport(specifier, posix.join(outputDir, 'skin.ts')),
      }),
      emitReactSkin(catalog, {
        skin: skin.name,
        iconSet: skin.iconSet,
        resolveImport: resolveReactPackageImport,
      }),
    ]);

    await Promise.all([
      syncSkinOutput(frameworkPackages.html, outputDir, html, options.check),
      syncSkinOutput(frameworkPackages.react, outputDir, react, options.check),
    ]);
  }

  const shadcn = await emitShadcnRegistry(catalog, skinRegistry, {
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
    managedRoots: [posix.join(skinRegistry.paths.output, skinRegistry.paths.source)],
    files: [
      ...inDirectory(shadcn.files, skinRegistry.paths.output),
      {
        path: posix.join(skinRegistry.paths.output, 'registry.json'),
        content: JSON.stringify(shadcn.registry),
      },
    ],
    check: options.check,
    format: formatGeneratedFile,
  });
}

async function syncSkinOutput(
  packageRoot: string,
  outputDir: string,
  output: { files: readonly GeneratedFile[]; styles: readonly GeneratedFile[] },
  check: boolean | undefined
): Promise<void> {
  await syncGeneratedFiles({
    rootDir: packageRoot,
    managedRoots: [outputDir],
    files: inDirectory([...output.files, ...output.styles], outputDir),
    check,
    format: formatGeneratedFile,
  });
}

function inDirectory(files: Iterable<GeneratedFile>, outputDir: string): GeneratedFile[] {
  return [...files].map((file) => ({
    path: posix.join(outputDir, file.path),
    content: file.content,
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSkins({ check: process.argv.includes('--check') });
}
