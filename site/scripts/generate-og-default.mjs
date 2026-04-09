/**
 * Generates the default OG image: Video.js mono logo in manila on a dark background.
 *
 * Usage: node scripts/generate-og-default.mjs
 * Output: public/og-default.png (1200×630)
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BACKGROUND = '#1e1d1d'; // faded-black (dark mode bg)
const LOGO_FILL = '#f3e7d2'; // manila-light
const WIDTH = 1200;
const HEIGHT = 630;

// Read the mono logo SVG and replace currentColor with manila
const logoSvg = readFileSync(resolve(__dirname, '../src/assets/logos/videojs-mono.svg'), 'utf-8');

// The logo viewBox is 0 0 381 68 → aspect ratio ~5.6:1
const logoNativeW = 381;
const logoNativeH = 68;
const logoAspect = logoNativeW / logoNativeH;

// ~80% of image width
const logoW = Math.round(WIDTH * 0.8);
const logoH = Math.round(logoW / logoAspect);

// Prepare the logo SVG at the target size with manila fill
const coloredLogo = logoSvg
  .replace(/currentColor/g, LOGO_FILL)
  .replace(/<svg /, `<svg width="${logoW}" height="${logoH}" `);

// Optical centering: nudge the logo left by ⅛ the rendered "V" width.
// The "V" spans 0–66.14 in the 381-unit viewBox → ~167 px at logoW.
// ⅛ of that ≈ 21 px.
const vWidthPx = (66.14 / logoNativeW) * logoW;
const nudgeLeft = Math.round(vWidthPx / 8);

const centreLeft = Math.round((WIDTH - logoW) / 2);
const centreTop = Math.round((HEIGHT - logoH) / 2);

const image = sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 4,
    background: BACKGROUND,
  },
})
  .composite([
    {
      input: Buffer.from(coloredLogo),
      left: centreLeft - nudgeLeft,
      top: centreTop,
    },
  ])
  .png();

const outputPath = resolve(__dirname, '../public/og-default.png');
await image.toFile(outputPath);
console.log(`Generated ${outputPath} (${WIDTH}×${HEIGHT})`);
