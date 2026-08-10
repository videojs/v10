import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type { SkinStyleRole } from '../../canonical/styles/define';
import type { SkinStyleResources } from '../catalog/types';

export interface FrameworkStyleFile {
  fileName: string;
  content: string;
}

export async function createFrameworkStyles(
  resources: SkinStyleResources,
  rootDir: string,
  styles: ReadonlyMap<SkinStyleRole, string>
): Promise<FrameworkStyleFile[]> {
  const themePath = resources.themes.default;
  if (!themePath) throw new Error('Framework Skin generation requires a default theme resource.');

  const roleFiles = [...styles]
    .map(([role, content]) => ({ fileName: `${role}.css`, content }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  const files: FrameworkStyleFile[] = [
    {
      fileName: 'styles/base.css',
      content: await readFile(resolve(rootDir, resources.base), 'utf8'),
    },
    { fileName: 'styles/theme.css', content: await readFile(resolve(rootDir, themePath), 'utf8') },
    ...roleFiles.map((file) => ({ ...file, fileName: `styles/${file.fileName}` })),
  ];
  return [
    {
      fileName: 'styles/styles.css',
      content: [
        '@layer videojs.base, videojs.theme, videojs.components;',
        ...files.map((file) => `@import './${basename(file.fileName)}';`),
      ].join('\n'),
    },
    ...files,
  ];
}
