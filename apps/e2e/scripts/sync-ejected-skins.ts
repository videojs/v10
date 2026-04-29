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
  tsx?: string;
  css?: string;
}

const skins: EjectedSkinEntry[] = JSON.parse(readFileSync(EJECTED_SKINS_JSON, 'utf-8'));

const reactVideo = skins.find((s) => s.id === 'default-video-react');

if (!reactVideo?.tsx) {
  throw new Error('Ejected skin "default-video-react" not found. Run `pnpm -F site ejected-skins` first.');
}

mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(resolve(OUT_DIR, 'ejected-react-video-skin.tsx'), reactVideo.tsx);

if (reactVideo.css) {
  writeFileSync(resolve(OUT_DIR, 'player.css'), reactVideo.css);
}

console.log('Synced ejected React video skin to apps/e2e/apps/vite/src/_generated/');
