import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type { SkinStyleResources } from '../../canonical/catalog';

export interface FrameworkStyleFile {
  fileName: string;
  content: string;
}

export async function createFrameworkStyles(
  resources: SkinStyleResources,
  rootDir: string,
  styles: ReadonlyMap<string, string>,
  theme = 'default'
): Promise<FrameworkStyleFile[]> {
  const themePath = resources.themes[theme];
  if (!themePath) throw new Error(`Framework Skin generation requires a \`${theme}\` theme resource.`);

  const styleFiles = [...styles]
    .map(([fileName, content]) => ({ fileName, content }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  const sharedFiles = [resources.base, ...(resources.shared ?? [])];
  const files: FrameworkStyleFile[] = [
    ...(await Promise.all(
      sharedFiles.map(async (path) => ({
        fileName: `styles/${basename(path)}`,
        content: await readFile(resolve(rootDir, path), 'utf8'),
      }))
    )),
    { fileName: 'styles/theme.css', content: await readFile(resolve(rootDir, themePath), 'utf8') },
    ...styleFiles.map((file) => ({ ...file, fileName: `styles/${file.fileName}` })),
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
