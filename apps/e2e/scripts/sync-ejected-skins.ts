/**
 * Syncs the generated ejected skin source from the docs site build
 * into the e2e test app so the ejected React test uses real output.
 *
 * Run after `pnpm -F site ejected-skins` and before e2e tests.
 */

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EJECTED_SKINS_JSON = resolve(import.meta.dirname, '../../../site/src/content/ejected-skins.json');
const OUT_DIR = resolve(import.meta.dirname, '../apps/vite/src/_generated');
const SOURCE_REGISTRY_DIR = resolve(import.meta.dirname, '../../../registry');

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

const sourceUiDir = resolve(OUT_DIR, 'source-ui');
rmSync(sourceUiDir, { recursive: true, force: true });

for (const [name, path] of [
  ['react-tailwind', 'react/tailwind'],
  ['react-css', 'react/css'],
  ['html-tailwind', 'html/tailwind'],
  ['html-css', 'html/css'],
] as const) {
  cpSync(resolve(SOURCE_REGISTRY_DIR, path, 'components/videojs'), resolve(sourceUiDir, name, 'components/videojs'), {
    recursive: true,
  });
}

console.log('Synced generated source-owned controls to apps/e2e/apps/vite/src/_generated/source-ui/.');
