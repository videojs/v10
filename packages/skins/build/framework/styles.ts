import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import {
  createStyleProgram,
  type DesignSystem,
  type StyleEmitResult,
  type StyleProgram,
} from '@videojs/compiler/tailwind';
import type { ResolvedSkinItem } from '../graph/types';

export interface FrameworkStyleFile {
  fileName: string;
  source: string;
}

export function createFrameworkStyleProgram(design: DesignSystem): StyleProgram {
  return createStyleProgram({
    design,
    output: 'styles.css',
    mode: 'split',
    tailwindVariables: 'inline',
    themeSelector: '.media-skin',
  });
}

export async function createFrameworkStyles(
  item: ResolvedSkinItem,
  rootDir: string,
  design: DesignSystem,
  emitted: StyleEmitResult
): Promise<FrameworkStyleFile[]> {
  const chunks = emitted.files.filter((file) => file.kind === 'chunk');
  const index = emitted.files.find((file) => file.kind === 'index');
  if (!index || chunks.length === 0 || emitted.files.some((file) => file.kind !== 'index' && file.kind !== 'chunk')) {
    throw new Error('Framework Skin generation expected one split CSS index and named role chunks.');
  }
  const expectedIndex = chunks.map((file) => `@import "./${basename(file.fileName)}";`).join('\n');
  if (normalizeCssImports(index.source) !== normalizeCssImports(expectedIndex)) {
    throw new Error('Framework Skin split CSS index unexpectedly contains global support styles.');
  }

  const resources = item.resources.styles ?? [];
  const basePath = resources.find((path) => path.endsWith('/base.css'));
  const themePath = resources.find((path) => path.endsWith('/themes/default.css'));
  if (!basePath || !themePath) throw new Error(`Skin item \`${item.name}\` is missing base or default theme CSS.`);

  const roleFiles = chunks
    .map((file) => ({ fileName: basename(file.fileName), source: file.source }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  const files: FrameworkStyleFile[] = [
    { fileName: 'styles/preflight.css', source: await design.compilePreflight('.media-skin') },
    { fileName: 'styles/base.css', source: await readFile(resolve(rootDir, basePath), 'utf8') },
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

function normalizeCssImports(source: string): string {
  return source.replaceAll("'", '"').replace(/\s+/g, ' ').trim();
}
