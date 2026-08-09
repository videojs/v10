import { resolve } from 'node:path';
import type { ResolvedSkinCatalog } from '../catalog/types';
import { compileSkinStyles, loadDesignSystem } from '../styles/compile';
import { loadCatalogStyleManifest } from '../styles/manifest';
import { createSkinStyleUsage } from '../styles/transform';
import { generateHtmlSkinSource } from './html';
import { generateReactSkinSources } from './react';
import { createFrameworkStyles, type FrameworkStyleFile } from './styles';

export type FrameworkProjection =
  | { framework: 'html'; resolveImport?: ((source: string) => string) | undefined }
  | { framework: 'react' };

interface FrameworkSkinSource {
  framework: FrameworkProjection['framework'];
  fileName: string;
  source: string;
}

interface FrameworkSkinFiles {
  sources: readonly FrameworkSkinSource[];
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
): Promise<FrameworkSkinFiles> {
  const skin = catalog.items.find((item) => item.name === options.skin && item.type === 'skin');
  if (!skin) throw new Error(`Skin \`${options.skin}\` does not exist.`);

  const entryFile = resolve(options.rootDir, skin.source);
  const styles = await loadCatalogStyleManifest(catalog, { rootDir: options.rootDir, itemNames: [skin.name] });
  const design = await loadDesignSystem(resolve(options.rootDir, catalog.resources.styles.tailwind));
  const usage = createSkinStyleUsage();
  const iconSet = options.iconSet ?? 'default';
  const projections = uniqueProjections(options.projections, skin.name);
  const sources: FrameworkSkinSource[] = [];

  for (const projection of projections) {
    if (projection.framework === 'html') {
      sources.push({
        framework: 'html',
        fileName: 'skin.ts',
        source: await generateHtmlSkinSource(
          catalog,
          skin.name,
          entryFile,
          iconSet,
          styles,
          usage,
          projection.resolveImport
        ),
      });
    } else {
      const files = await generateReactSkinSources(catalog, {
        rootDir: options.rootDir,
        skin: skin.name,
        iconSet,
        styles,
        usage,
      });
      for (const file of files) {
        sources.push({ framework: 'react', fileName: file.path, source: file.content });
      }
    }
  }

  return {
    sources,
    styles: await createFrameworkStyles(
      catalog.resources.styles,
      options.rootDir,
      design,
      await compileSkinStyles({ design, manifest: styles, usage })
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
