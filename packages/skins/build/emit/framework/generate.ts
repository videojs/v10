import { resolve } from 'node:path';

import { loadCatalogStyles, resolveCatalog } from '@videojs/compiler/catalog';
import { collectReferencedStyleRules, compileStyles, loadDesignSystem } from '@videojs/compiler/styles';

import type { SkinCatalog, SkinCatalogItem } from '../../catalog';
import type { ReactImportResolver } from '../../transform/react';
import { generateHtmlSkin } from './html';
import { generateReactSkins } from './react';
import { createFrameworkStyles, type FrameworkStyleFile } from './styles';

export type FrameworkTarget =
  | { framework: 'html'; resolveImport?: ((specifier: string) => string) | undefined }
  | { framework: 'react'; resolveImport?: ReactImportResolver | undefined };

interface FrameworkSkinFile {
  framework: FrameworkTarget['framework'];
  fileName: string;
  content: string;
}

interface FrameworkSkinOutput {
  files: readonly FrameworkSkinFile[];
  styles: readonly FrameworkStyleFile[];
}

interface CreateFrameworkSkinOptions {
  rootDir: string;
  skin: SkinCatalogItem['name'];
  iconSet?: string | undefined;
  targets: readonly FrameworkTarget[];
}

/** Create vanilla-CSS Skin outputs consumed by framework packages. */
export async function createFrameworkSkin(
  catalog: SkinCatalog,
  options: CreateFrameworkSkinOptions
): Promise<FrameworkSkinOutput> {
  const skin = catalog.items.find((item) => item.name === options.skin && item.type === 'skin');

  if (skin?.type !== 'skin') throw new Error(`Skin \`${options.skin}\` does not exist.`);

  const entryFile = resolve(options.rootDir, skin.source);
  const styles = await loadCatalogStyles(catalog, [skin.name]);
  const resolved = resolveCatalog(catalog, [skin.name]);
  const ruleClassNames = await collectReferencedStyleRules(
    resolved.files.source.map((file) => resolve(options.rootDir, file)),
    styles
  );
  const design = await loadDesignSystem(resolve(options.rootDir, catalog.resources.styles.tailwind.compiler));
  const iconSet = options.iconSet ?? 'default';
  const targets = uniqueTargets(options.targets, skin.name);
  const files: FrameworkSkinFile[] = [];

  for (const target of targets) {
    if (target.framework === 'html') {
      files.push({
        framework: 'html',
        fileName: 'skin.ts',
        content: await generateHtmlSkin(catalog, {
          skin: skin.name,
          entryFile,
          iconSet,
          styles: { mode: 'css', manifest: styles, variant: skin.style.variant },
          ...(target.resolveImport ? { resolveImport: target.resolveImport } : {}),
        }),
      });
    } else {
      const reactFiles = await generateReactSkins(catalog, {
        skin: skin.name,
        iconSet,
        styles: { mode: 'css', manifest: styles, variant: skin.style.variant },
        ...(target.resolveImport ? { resolveImport: target.resolveImport } : {}),
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
      await compileStyles({
        design,
        manifest: styles,
        scope: `.${skin.style.scope}`,
        variant: skin.style.variant,
        ruleClassNames,
      }),
      skin.style.theme
    ),
  };
}

function uniqueTargets(targets: readonly FrameworkTarget[], skin: string): readonly FrameworkTarget[] {
  if (targets.length === 0) {
    throw new Error(`Framework Skin generation requires a target for Skin \`${skin}\`.`);
  }

  const frameworks = new Set<FrameworkTarget['framework']>();

  for (const target of targets) {
    if (frameworks.has(target.framework)) {
      throw new Error(`Framework Skin generation received duplicate ${target.framework} targets for Skin \`${skin}\`.`);
    }

    frameworks.add(target.framework);
  }

  return targets;
}
