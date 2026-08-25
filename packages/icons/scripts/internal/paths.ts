import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT = join(__dirname, '../..');

export const ASSETS_DIR = join(ROOT, 'src/assets');
export const DIST_DIR = join(ROOT, 'dist');

export function getIconSets(): string[] {
  if (!existsSync(ASSETS_DIR)) {
    throw new Error(`Assets directory not found: ${ASSETS_DIR}`);
  }

  return readdirSync(ASSETS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'index')
    .map((entry) => entry.name)
    .sort();
}

export function getSvgFiles(setName: string): string[] {
  return readdirSync(join(ASSETS_DIR, setName))
    .filter((file) => file.endsWith('.svg'))
    .sort();
}
