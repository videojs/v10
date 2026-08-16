import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ImportRef } from '@videojs/compiler/ast';
import { canonicalRoot, loadSkinCatalog, skinsPackageRoot } from '../build/catalog/load';
import { resolveSkinClosure } from '../build/catalog/resolve';
import type { ReactImportResolver } from '../build/compiler/react';
import { createFrameworkSkin, type FrameworkProjection } from '../build/framework/generate';
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

type FrameworkSkinTarget =
  | (FrameworkSkinTargetBase & {
      framework: 'html';
      resolveImport?: ((specifier: string) => string) | undefined;
    })
  | (FrameworkSkinTargetBase & {
      framework: 'react';
      resolveImport?: ReactImportResolver | undefined;
    });

export interface GenerateSkinsOptions {
  check?: boolean | undefined;
  frameworkTargets?: readonly FrameworkSkinTarget[] | undefined;
}

const frameworkSkins = [
  { name: 'default-video', iconSet: 'default' },
  { name: 'minimal-video', iconSet: 'minimal' },
] as const;

const defaultFrameworkTargets: readonly FrameworkSkinTarget[] = frameworkSkins.flatMap(({ name, iconSet }) => {
  const outputDir = `src/__generated__/skins/${name}`;
  return [
    {
      framework: 'html' as const,
      packageRoot: resolve(skinsPackageRoot, '../html'),
      outputDir,
      skin: name,
      iconSet,
      resolveImport: htmlPackageImportResolver(posix.join(outputDir, 'skin.ts')),
    },
    {
      framework: 'react' as const,
      packageRoot: resolve(skinsPackageRoot, '../react'),
      outputDir,
      skin: name,
      iconSet,
      resolveImport: reactPackageImportResolver,
    },
  ];
});

/** Generate framework Skins and the contained React/Tailwind registry. */
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
        async (style) => [style.fileName, await formatGeneratedFile(style.fileName, style.content)] as const
      )
    );
    for (const target of group.targets) {
      const generatedFiles = output.files.filter((file) => file.framework === target.framework);
      if (generatedFiles.length === 0) {
        throw new Error(`Framework Skin generation did not emit the ${target.framework} target.`);
      }
      const files = new Map<string, string>();
      for (const file of generatedFiles) {
        files.set(posix.join(target.outputDir, file.fileName), await formatGeneratedFile(file.fileName, file.content));
      }
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
  const registrySkin = catalog.items.find((item) => item.type === 'skin' && item.name === skinRegistry.skin);
  if (registrySkin?.type !== 'skin') throw new Error(`Registry Skin \`${skinRegistry.skin}\` does not exist.`);
  const output = await generateReactRegistry(catalog, {
    rootDir: canonicalRoot,
    itemNames: [...new Set([...closure.items.map((item) => item.name), ...skinRegistry.items])],
    variant: registrySkin.variant,
    sourceRoot: skinRegistry.sourceRoot,
    installAlias: `@/${skinRegistry.installRoot}`,
    utility: {
      source: skinRegistry.utilityItem.source,
      target: skinRegistry.utilityItem.target,
      importSource: `@/${skinRegistry.installRoot}/${skinRegistry.utilityItem.target.replace(/\.ts$/, '')}`,
    },
  });
  const files = await collectGeneratedFiles(
    [...output.sharedFiles, ...output.utilityFiles, ...Object.values(output.items).flat()],
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
    : {
        framework: 'react',
        ...(target.resolveImport ? { resolveImport: target.resolveImport } : {}),
      };
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

function htmlPackageImportResolver(outputFile: string): (specifier: string) => string {
  return (specifier) => {
    const target = htmlPackageModule(specifier);
    const relative = posix.relative(posix.dirname(outputFile), target);
    return relative.startsWith('.') ? relative : `./${relative}`;
  };
}

function htmlPackageModule(specifier: string): string {
  if (specifier === '@videojs/html/i18n') return 'src/define/i18n';
  const uiPrefix = '@videojs/html/ui/';
  if (specifier.startsWith(uiPrefix)) return posix.join('src/define/ui', specifier.slice(uiPrefix.length));
  const mediaPrefix = '@videojs/html/media/';
  if (specifier.startsWith(mediaPrefix)) return posix.join('src/define/media', specifier.slice(mediaPrefix.length));
  const iconsPrefix = '@videojs/html/icons/element';
  if (specifier === iconsPrefix) return 'src/icons/element';
  if (specifier.startsWith(`${iconsPrefix}/`))
    return posix.join('src/icons/element', specifier.slice(iconsPrefix.length + 1));
  throw new Error(`Cannot resolve HTML package import \`${specifier}\`.`);
}

function reactPackageImportResolver(reference: ImportRef): ImportRef | false {
  if (reference.source === '@videojs/react') {
    if (reference.name === 'Text') return false;
    if (reference.name === 'Container' || reference.name === 'ContainerProps') {
      return { ...reference, source: '@/player/container' };
    }
    if (reference.name === 'Poster' || reference.name === 'PosterProps') {
      return { ...reference, source: '@/ui/poster' };
    }
    if (reference.name === 'usePlayer') return { ...reference, source: '@/player/context' };
    if (reference.name === 'useTranslator') return { ...reference, source: '@/i18n' };
    if (reference.name === 'useQualityOptions') {
      return { ...reference, source: '@/ui/quality/use-quality-options' };
    }
    if (reference.name === 'useAudioTrackOptions') {
      return { ...reference, source: '@/ui/audio-track/use-audio-track-options' };
    }
    if (reference.name === 'usePlaybackRateOptions') {
      return { ...reference, source: '@/ui/playback-rate/use-playback-rate-options' };
    }
    if (reference.name === 'useCaptionsOptions') {
      return { ...reference, source: '@/ui/captions-radio-group/use-captions-options' };
    }
    if (reference.name === 'RenderProp') return { ...reference, source: '@/utils/types' };
    return { ...reference, source: `@/ui/${reactComponentModule(reference.name)}` };
  }
  const iconsPrefix = '@videojs/react/icons';
  if (reference.source === iconsPrefix) return { ...reference, source: '@/icons' };
  if (reference.source.startsWith(`${iconsPrefix}/`)) {
    return { ...reference, source: `@/icons/${reference.source.slice(iconsPrefix.length + 1)}` };
  }
  return reference;
}

const reactComponentModules: Readonly<Record<string, string>> = {
  AirPlayButton: 'airplay-button',
  PiPButton: 'pip-button',
};

function reactComponentModule(name: string): string {
  return reactComponentModules[name] ?? kebabCase(name);
}

function kebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSkins({ check: process.argv.includes('--check') });
}
