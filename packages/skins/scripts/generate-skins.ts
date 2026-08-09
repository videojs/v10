import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalRoot, loadSkinCatalog, skinsPackageRoot } from '../build/catalog/load';
import { resolveSkinClosure } from '../build/catalog/resolve';
import {
  createFrameworkSkin,
  type FrameworkProjection,
  type FrameworkSkinSource,
  type SkinFramework,
} from '../build/framework/generate';
import { collectGeneratedFiles, formatGeneratedFile, syncGeneratedFiles } from '../build/output/files';
import { createRegistryManifest } from '../build/registry/manifest';
import { generateReactRegistry } from '../build/registry/source';
import { skinRegistry } from '../canonical/registry/config';

interface FrameworkSkinTargetBase {
  packageRoot: string;
  outputDir: string;
  skin: string;
  iconSet?: string | undefined;
}

export type FrameworkSkinTarget =
  | (FrameworkSkinTargetBase & {
      framework: 'html';
      resolveImport?: ((source: string) => string) | undefined;
    })
  | (FrameworkSkinTargetBase & { framework: 'react' });

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
    resolveImport: htmlPackageImportResolver(posix.join(DEFAULT_SKIN_OUTPUT_DIR, 'skin.ts')),
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

  for (const group of groupFrameworkTargets(targets)) {
    const output = await createFrameworkSkin(catalog, {
      rootDir: canonicalRoot,
      skin: group.skin,
      ...(group.iconSet === 'default' ? {} : { iconSet: group.iconSet }),
      projections: group.targets.map(toFrameworkProjection),
    });
    const styles = await Promise.all(
      output.styles.map(
        async (style) => [style.fileName, await formatGeneratedFile(style.fileName, style.source)] as const
      )
    );
    for (const target of group.targets) {
      const source = findFrameworkSource(output.sources, target.framework);
      const files = new Map<string, string>();
      files.set(
        posix.join(target.outputDir, source.sourceFile),
        await formatGeneratedFile(source.sourceFile, source.source)
      );
      for (const [fileName, formatted] of styles) {
        files.set(posix.join(target.outputDir, fileName), formatted);
      }
      await syncGeneratedFiles({
        rootDir: target.packageRoot,
        files,
        managedRoots: [target.outputDir],
        check: options.check,
      });
    }
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

function toFrameworkProjection(target: FrameworkSkinTarget): FrameworkProjection {
  return target.framework === 'html'
    ? {
        framework: 'html',
        ...(target.resolveImport ? { resolveImport: target.resolveImport } : {}),
      }
    : { framework: 'react' };
}

function findFrameworkSource(sources: readonly FrameworkSkinSource[], framework: SkinFramework): FrameworkSkinSource {
  const source = sources.find((candidate) => candidate.framework === framework);
  if (!source) throw new Error(`Framework Skin generation did not emit the ${framework} target.`);
  return source;
}

function groupFrameworkTargets(
  targets: readonly FrameworkSkinTarget[]
): Array<{ skin: string; iconSet: string; targets: FrameworkSkinTarget[] }> {
  const groups = new Map<string, { skin: string; iconSet: string; targets: FrameworkSkinTarget[] }>();
  for (const target of targets) {
    const iconSet = target.iconSet ?? 'default';
    const key = `${target.skin}\0${iconSet}`;
    let group = groups.get(key);
    if (!group) {
      group = { skin: target.skin, iconSet, targets: [] };
      groups.set(key, group);
    }
    if (group.targets.some((existing) => existing.framework === target.framework)) {
      throw new Error(
        `Framework Skin generation received multiple ${target.framework} outputs for Skin \`${target.skin}\`.`
      );
    }
    group.targets.push(target);
  }
  return [...groups.values()];
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
