import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrameworkSkin, type SkinFramework } from '../build/framework/generate';
import { canonicalRoot, loadSkinCatalog, skinsPackageRoot } from '../build/graph/load';
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
  resolveHtmlImport?: ((source: string) => string) | undefined;
}

export interface GenerateSkinsOptions {
  check?: boolean | undefined;
  frameworkTargets?: readonly FrameworkSkinTarget[] | undefined;
}

const DEFAULT_SKIN = 'default-video';
const DEFAULT_SKIN_OUTPUT_DIR = `src/__generated__/skins/${DEFAULT_SKIN}`;

const defaultFrameworkTargets: readonly FrameworkSkinTarget[] = [
  {
    framework: 'html',
    packageRoot: resolve(skinsPackageRoot, '../html'),
    outputDir: DEFAULT_SKIN_OUTPUT_DIR,
    skin: DEFAULT_SKIN,
    resolveHtmlImport: htmlPackageImportResolver(posix.join(DEFAULT_SKIN_OUTPUT_DIR, 'skin.ts')),
  },
  {
    framework: 'react',
    packageRoot: resolve(skinsPackageRoot, '../react'),
    outputDir: DEFAULT_SKIN_OUTPUT_DIR,
    skin: DEFAULT_SKIN,
  },
];

/** Generate compact framework Skins and the contained React/Tailwind registry. */
export async function generateSkins(options: GenerateSkinsOptions = {}): Promise<void> {
  const catalog = await loadSkinCatalog();
  const targets = options.frameworkTargets ?? defaultFrameworkTargets;

  for (const target of targets) {
    const output = await createFrameworkSkin(catalog, {
      framework: target.framework,
      rootDir: canonicalRoot,
      skin: target.skin,
      ...(target.iconSet ? { iconSet: target.iconSet } : {}),
      ...(target.resolveHtmlImport ? { resolveHtmlImport: target.resolveHtmlImport } : {}),
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

  const closure = resolveSkinClosure(catalog, skinRegistry.skin);
  const output = await generateReactRegistry(catalog, {
    rootDir: canonicalRoot,
    itemNames: closure.itemNames,
    sourceRoot: skinRegistry.sourceRoot,
    installAlias: `@/${skinRegistry.installRoot}`,
  });
  const files = await collectGeneratedFiles(
    [...output.sharedFiles, ...Object.values(output.items).flat()],
    skinRegistry.outputDir
  );
  files.set(
    posix.join(skinRegistry.outputDir, 'registry.json'),
    await formatGeneratedFile('registry.json', JSON.stringify(createRegistryManifest(catalog, output, skinRegistry)))
  );
  await syncGeneratedFiles({
    rootDir: skinsPackageRoot,
    files,
    managedRoots: [posix.join(skinRegistry.outputDir, skinRegistry.sourceRoot)],
    check: options.check,
  });
}

function htmlPackageImportResolver(outputFile: string): (source: string) => string {
  return (source) => {
    const target = htmlSourceModule(source);
    const specifier = posix.relative(posix.dirname(outputFile), target);
    return specifier.startsWith('.') ? specifier : `./${specifier}`;
  };
}

function htmlSourceModule(source: string): string {
  const uiPrefix = '@videojs/html/ui/';
  if (source.startsWith(uiPrefix)) return posix.join('src/define/ui', source.slice(uiPrefix.length));
  const iconsPrefix = '@videojs/html/icons/element';
  if (source === iconsPrefix) return 'src/icons/element';
  if (source.startsWith(`${iconsPrefix}/`))
    return posix.join('src/icons/element', source.slice(iconsPrefix.length + 1));
  throw new Error(`Cannot resolve HTML package source import \`${source}\`.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSkins({ check: process.argv.includes('--check') });
}
