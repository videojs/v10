import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT = join(__dirname, '../..');
export const ASSETS_DIR = join(ROOT, 'src/assets');
export const DIST_DIR = join(ROOT, 'dist');

export function getIconSets(): string[] {
  if (!existsSync(ASSETS_DIR)) {
    console.error(`Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }
  return readdirSync(ASSETS_DIR).filter((item) => !item.startsWith('.') && item !== 'index');
}

export function getSvgFiles(setName: string): string[] {
  return readdirSync(join(ASSETS_DIR, setName)).filter((f) => f.endsWith('.svg'));
}
