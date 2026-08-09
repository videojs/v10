import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectGeneratedFiles, formatGeneratedFile, syncGeneratedFiles } from '../build/files';
import { createFrameworkSkin, type SkinFramework } from '../build/framework';
import { loadSkinManifest, skinsRoot } from '../build/load';
import { createRegistryManifest } from '../build/registry/manifest';
import { generateReactRegistry } from '../build/registry/react';
import { resolveSkinClosure } from '../build/resolve';
import { skinRegistry } from '../src/registry/config';

export interface FrameworkSkinTarget {
  framework: SkinFramework;
  packageRoot: string;
  outputDir: string;
  skin: string;
  iconSet?: string | undefined;
}

export interface GenerateSkinsOptions {
  check?: boolean | undefined;
  frameworkTargets?: readonly FrameworkSkinTarget[] | undefined;
  registryOutputDir?: string | undefined;
}

const defaultFrameworkTargets: readonly FrameworkSkinTarget[] = [
  {
    framework: 'html',
    packageRoot: resolve(skinsRoot, '../html'),
    outputDir: 'src/__generated__/skins/default-video',
    skin: 'default-video',
  },
  {
    framework: 'react',
    packageRoot: resolve(skinsRoot, '../react'),
    outputDir: 'src/__generated__/skins/default-video',
    skin: 'default-video',
  },
];

/** Generate compact framework Skins and the contained React/Tailwind registry. */
export async function generateSkins(options: GenerateSkinsOptions = {}): Promise<void> {
  const manifest = await loadSkinManifest();
  const targets = options.frameworkTargets ?? defaultFrameworkTargets;

  for (const target of targets) {
    const output = await createFrameworkSkin(manifest, {
      framework: target.framework,
      rootDir: skinsRoot,
      skin: target.skin,
      ...(target.iconSet ? { iconSet: target.iconSet } : {}),
    });
    const files = new Map<string, string>();
    files.set(
      posix.join(target.outputDir, output.sourceFile),
      await formatGeneratedFile(output.sourceFile, output.source)
    );
    files.set(posix.join(target.outputDir, 'styles.css'), await formatGeneratedFile('styles.css', output.styles));
    await syncGeneratedFiles({
      rootDir: target.packageRoot,
      files,
      managedRoots: [target.outputDir],
      check: options.check,
    });
  }

  const registryOutputDir = options.registryOutputDir ?? 'src/registry';
  const closure = resolveSkinClosure(manifest, 'default-video');
  const output = await generateReactRegistry(manifest, {
    rootDir: skinsRoot,
    itemNames: closure.itemNames,
    targetRoot: 'default',
    installAlias: `@/${skinRegistry.installRoot}`,
  });
  const files = await collectGeneratedFiles(output, registryOutputDir);
  files.set(
    posix.join(registryOutputDir, 'registry.json'),
    await formatGeneratedFile('registry.json', JSON.stringify(createRegistryManifest(manifest, output, skinRegistry)))
  );
  await syncGeneratedFiles({
    rootDir: skinsRoot,
    files,
    managedRoots: [posix.join(registryOutputDir, 'default')],
    check: options.check,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSkins({ check: process.argv.includes('--check') });
}
