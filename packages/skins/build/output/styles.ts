import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import type { CatalogOutputFile, CatalogStyleTransform } from 'vjsc/catalog';

import type { SkinCatalog, SkinCatalogSkin } from '../catalog';

export function skinStyleTransform(
  catalog: SkinCatalog,
  skin: SkinCatalogSkin
): Extract<CatalogStyleTransform, { mode: 'css' }> {
  return {
    mode: 'css',
    input: catalog.resources.styles.tailwind.compiler,
    scope: `.${skin.style.scope}`,
    variant: skin.style.variant,
  };
}

/** Package compiled Skin CSS with its shared behavior and selected theme. */
export async function packageSkinStyles(
  catalog: SkinCatalog,
  skin: SkinCatalogSkin,
  compiled: readonly CatalogOutputFile[]
): Promise<CatalogOutputFile[]> {
  const resources = catalog.resources.styles;
  const themePath = resources.themes[skin.style.theme];

  if (!themePath) throw new Error(`Skin generation requires a \`${skin.style.theme}\` theme resource.`);

  const resourceFiles = await Promise.all(
    [resources.base, ...(resources.shared ?? [])].map(async (path) => ({
      path: `styles/${basename(path)}`,
      content: await readFile(resolve(catalog.rootDir, path), 'utf8'),
    }))
  );
  const files = [
    ...resourceFiles,
    {
      path: 'styles/theme.css',
      content: await readFile(resolve(catalog.rootDir, themePath), 'utf8'),
    },
    ...compiled.map((file) => ({
      path: `styles/${file.path}`,
      content: file.content,
    })),
  ];

  return [
    {
      path: 'styles/styles.css',
      content: [
        '@layer videojs.base, videojs.theme, videojs.components;',
        ...files.map((file) => `@import './${basename(file.path)}';`),
      ].join('\n'),
    },
    ...files,
  ];
}
