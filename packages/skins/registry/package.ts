import { posix } from 'node:path';
import { createRegistryCatalog, mergeRegistryCatalogs } from './catalog';
import { collectGeneratedFiles, formatGeneratedFile, syncGeneratedFiles } from './files';
import type { RegistryOutput, RegistryStyle, RegistryVariant } from './generate';
import { loadRegistry, skinsRoot } from './load';
import { resolveRegistryClosure } from './resolve';
import type { ResolvedRegistry } from './types';

const styles = ['css', 'tailwind'] as const satisfies readonly RegistryStyle[];

export interface GeneratePackageRegistryOptions {
  framework: RegistryVariant['framework'];
  packageRoot: string;
  emit(registry: ResolvedRegistry, style: RegistryStyle, itemNames: readonly string[]): Promise<RegistryOutput>;
  check?: boolean | undefined;
}

/** Generate one framework package's editable Skin sources and registry catalog. */
export async function generatePackageRegistry(options: GeneratePackageRegistryOptions): Promise<void> {
  const registry = await loadRegistry();
  const rootItem = 'default-video';
  const closure = resolveRegistryClosure(registry, rootItem);
  const itemNames = options.framework === 'html' ? [rootItem] : closure.itemNames;
  const files = new Map<string, string>();
  const catalogs = [];

  for (const style of styles) {
    const output = await options.emit(registry, style, itemNames);
    const generatedRoot = posix.join('src/__generated__/skins/default-video', style);
    await collectGeneratedFiles(output, generatedRoot, files);
    catalogs.push(
      createRegistryCatalog(registry, {
        target: { framework: options.framework, style },
        output,
        sourceRoot: generatedRoot,
      })
    );
  }

  files.set(
    'registry.json',
    await formatGeneratedFile('registry.json', JSON.stringify(mergeRegistryCatalogs(catalogs)))
  );
  await syncGeneratedFiles({
    rootDir: options.packageRoot,
    files,
    managedRoots: styles.map((style) => posix.join('src/__generated__/skins/default-video', style)),
    check: options.check,
  });
}

export { skinsRoot };
