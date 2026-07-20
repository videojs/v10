/**
 * Syncs the generated ejected skin source from the docs site build
 * into the e2e test app so the ejected React test uses real output.
 *
 * Run after `pnpm -F site ejected-skins` and before e2e tests.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EJECTED_SKINS_JSON = resolve(import.meta.dirname, '../../../site/src/content/ejected-skins.json');
const OUT_DIR = resolve(import.meta.dirname, '../apps/vite/src/_generated');

interface EjectedSkinEntry {
  id: string;
  platform: string;
  tsx?: Record<string, string>;
  css?: string;
}

const skins: EjectedSkinEntry[] = JSON.parse(readFileSync(EJECTED_SKINS_JSON, 'utf-8'));

const reactVideo = skins.find((s) => s.id === 'default-video-react');

const componentSource = reactVideo?.tsx?.['VideoPlayer.tsx'];
const playerSource = reactVideo?.tsx?.['player.ts'];

if (!componentSource || !playerSource) {
  throw new Error('Ejected skin "default-video-react" not found. Run `pnpm -F site ejected-skins` first.');
}

mkdirSync(OUT_DIR, { recursive: true });

// Component file is renamed to match the import path used in generate-pages.ts;
// `player.ts` keeps its name so the relative `./player` import resolves.
writeFileSync(resolve(OUT_DIR, 'ejected-react-video-skin.tsx'), componentSource);
writeFileSync(resolve(OUT_DIR, 'player.ts'), playerSource);

if (reactVideo.css) {
  writeFileSync(resolve(OUT_DIR, 'player.css'), reactVideo.css);
}

console.log('Synced ejected React video skin to apps/e2e/apps/vite/src/_generated/');
