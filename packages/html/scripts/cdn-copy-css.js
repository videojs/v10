import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlDist = resolve(root, 'dist/default/define');
const outDir = resolve(root, 'cdn');

const cssFiles = [
  { src: 'video/skin.css', dest: 'video.css' },
  { src: 'video/minimal-skin.css', dest: 'video-minimal.css' },
  { src: 'audio/skin.css', dest: 'audio.css' },
  { src: 'audio/minimal-skin.css', dest: 'audio-minimal.css' },
  { src: 'background/skin.css', dest: 'background.css' },
];

for (const { src, dest } of cssFiles) {
  const srcPath = resolve(htmlDist, src);
  const destPath = resolve(outDir, dest);
  const raw = readFileSync(srcPath);

  const { code } = transform({ filename: srcPath, code: raw, minify: true });

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, code);

  console.log(`  ${dest} (${raw.length} → ${code.length})`);
}
