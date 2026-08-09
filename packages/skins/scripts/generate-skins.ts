import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrameworkSkin, type SkinFramework } from '../build/framework/generate';
import { canonicalRoot, loadSkinManifest, skinsPackageRoot } from '../build/graph/load';
import { resolveSkinClosure } from '../build/graph/resolve';
import { collectGeneratedFiles, formatGeneratedFile, syncGeneratedFiles } from '../build/output/files';
import { createRegistryManifest } from '../build/registry/manifest';
import { generateReactRegistry } from '../build/registry/source';
import { skinRegistry } from '../canonical/registry/config';

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
    packageRoot: resolve(skinsPackageRoot, '../html'),
    outputDir: 'src/__generated__/skins/default-video',
    skin: 'default-video',
  },
  {
    framework: 'react',
    packageRoot: resolve(skinsPackageRoot, '../react'),
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
      rootDir: canonicalRoot,
      skin: target.skin,
      ...(target.iconSet ? { iconSet: target.iconSet } : {}),
    });
    const files = new Map<string, string>();
    files.set(
      posix.join(target.outputDir, output.sourceFile),
      await formatGeneratedFile(output.sourceFile, output.source)
    );
    for (const style of output.styles) {
      files.set(posix.join(target.outputDir, style.fileName), await formatGeneratedFile(style.fileName, style.source));
    }
    await syncGeneratedFiles({
      rootDir: target.packageRoot,
      files,
      managedRoots: [target.outputDir],
      check: options.check,
    });
  }

  const registryOutputDir = options.registryOutputDir ?? 'registry';
  const closure = resolveSkinClosure(manifest, 'default-video');
  const output = await generateReactRegistry(manifest, {
    rootDir: canonicalRoot,
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
    rootDir: canonicalRoot,
    files,
    managedRoots: [posix.join(registryOutputDir, 'default')],
    check: options.check,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSkins({ check: process.argv.includes('--check') });
}
