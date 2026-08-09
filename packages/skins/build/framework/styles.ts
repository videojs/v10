import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type { SkinStyleRole } from '../../canonical/styles/define';
import type { SkinStyleResources } from '../catalog/types';
import type { DesignSystem } from '../styles/compile';

export interface FrameworkStyleFile {
  fileName: string;
  source: string;
}

export async function createFrameworkStyles(
  resources: SkinStyleResources,
  rootDir: string,
  design: DesignSystem,
  styles: ReadonlyMap<SkinStyleRole, string>
): Promise<FrameworkStyleFile[]> {
  const themePath = resources.themes.default;
  if (!themePath) throw new Error('Framework Skin generation requires a default theme resource.');

  const roleFiles = [...styles]
    .map(([role, source]) => ({ fileName: `${role}.css`, source }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  const files: FrameworkStyleFile[] = [
    { fileName: 'styles/preflight.css', source: await design.compilePreflight('.media-skin') },
    {
      fileName: 'styles/base.css',
      source: await readFile(resolve(rootDir, resources.base), 'utf8'),
    },
    { fileName: 'styles/theme.css', source: await readFile(resolve(rootDir, themePath), 'utf8') },
    ...roleFiles.map((file) => ({ ...file, fileName: `styles/${file.fileName}` })),
  ];
  return [
    {
      fileName: 'styles/styles.css',
      source: files.map((file) => `@import './${basename(file.fileName)}';`).join('\n'),
    },
    ...files,
  ];
}
