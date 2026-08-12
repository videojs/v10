import { resolve } from 'node:path';
import type { ResolvedSkinCatalog } from '../catalog/types';
import type { ReactImportResolver } from '../compiler/react';
import { compileSkinStyles, loadDesignSystem } from '../styles/compile';
import { loadCatalogStyleManifest } from '../styles/manifest';
import { generateHtmlSkin } from './html';
import { generateReactSkins } from './react';
import { createFrameworkStyles, type FrameworkStyleFile } from './styles';

export type FrameworkProjection =
  | { framework: 'html'; resolveImport?: ((specifier: string) => string) | undefined }
  | { framework: 'react'; resolveImport?: ReactImportResolver | undefined };

interface FrameworkSkinFile {
  framework: FrameworkProjection['framework'];
  fileName: string;
  content: string;
}

interface FrameworkSkinOutput {
  files: readonly FrameworkSkinFile[];
  styles: readonly FrameworkStyleFile[];
}

interface CreateFrameworkSkinOptions {
  rootDir: string;
  skin: string;
  iconSet?: string | undefined;
  projections: readonly FrameworkProjection[];
}

/** Create vanilla-CSS Skin projections consumed by framework packages. */
export async function createFrameworkSkin(
  catalog: ResolvedSkinCatalog,
  options: CreateFrameworkSkinOptions
): Promise<FrameworkSkinOutput> {
  const skin = catalog.items.find((item) => item.name === options.skin && item.type === 'skin');
  if (skin?.type !== 'skin') throw new Error(`Skin \`${options.skin}\` does not exist.`);

  const entryFile = resolve(options.rootDir, skin.source);
  const styles = await loadCatalogStyleManifest(catalog, { rootDir: options.rootDir, itemNames: [skin.name] });
  const design = await loadDesignSystem(resolve(options.rootDir, catalog.resources.styles.tailwind));
  const iconSet = options.iconSet ?? 'default';
  const projections = uniqueProjections(options.projections, skin.name);
  const files: FrameworkSkinFile[] = [];

  for (const projection of projections) {
    if (projection.framework === 'html') {
      files.push({
        framework: 'html',
        fileName: 'skin.ts',
        content: await generateHtmlSkin(catalog, {
          skin: skin.name,
          entryFile,
          iconSet,
          styles,
          ...(projection.resolveImport ? { resolveImport: projection.resolveImport } : {}),
        }),
      });
    } else {
      const reactFiles = await generateReactSkins(catalog, {
        rootDir: options.rootDir,
        skin: skin.name,
        iconSet,
        styles,
        ...(projection.resolveImport ? { resolveImport: projection.resolveImport } : {}),
      });
      for (const file of reactFiles) {
        files.push({ framework: 'react', fileName: file.path, content: file.content });
      }
    }
  }

  return {
    files,
    styles: await createFrameworkStyles(
      catalog.resources.styles,
      options.rootDir,
      await compileSkinStyles({ design, manifest: styles, scopeClass: skin.scopeClass })
    ),
  };
}

function uniqueProjections(projections: readonly FrameworkProjection[], skin: string): readonly FrameworkProjection[] {
  if (projections.length === 0) {
    throw new Error(`Framework Skin generation requires a projection for Skin \`${skin}\`.`);
  }
  const frameworks = new Set<FrameworkProjection['framework']>();
  for (const projection of projections) {
    if (frameworks.has(projection.framework)) {
      throw new Error(
        `Framework Skin generation received duplicate ${projection.framework} projections for Skin \`${skin}\`.`
      );
    }
    frameworks.add(projection.framework);
  }
  return projections;
}
