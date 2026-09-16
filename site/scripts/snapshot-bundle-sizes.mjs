/**
 * Curate the homepage bundle-size snapshot from the repo's bundle-size measurement.
 *
 * Run the measurement first (it builds every package entry with esbuild and takes a few minutes):
 *
 * Node .github/scripts/bundle-size.js --json /tmp/sizes.json node site/scripts/snapshot-bundle-sizes.mjs
 * /tmp/sizes.json
 *
 * The snapshot is committed so the homepage can render the numbers statically; regenerate it when the presets change.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input) throw new Error('Usage: node snapshot-bundle-sizes.mjs <bundle-size.json>');

const PRESETS = [
  { name: '@videojs/react/video (default)', label: 'React video player' },
  { name: '@videojs/html/video (default)', label: 'HTML video player' },
  { name: '@videojs/react/audio (default)', label: 'React audio player' },
  { name: '@videojs/html/background', label: 'HTML background video' },
];

/**
 * Video.js 8 reference point: `video.min.js` from unpkg (video.js@8.24.0), brotli quality 11. Measured by hand on the
 * snapshot date; update alongside the presets when it drifts.
 */
const BASELINE = { label: 'Video.js 8', version: '8.24.0', initial: 167548, total: 167548 };

const entries = JSON.parse(readFileSync(input, 'utf8'));
const byName = new Map(entries.map((entry) => [entry.name, entry]));

const presets = PRESETS.map(({ name, label }) => {
  const entry = byName.get(name);
  if (!entry) throw new Error(`Missing entry ${name}`);

  return { label, initial: entry.size, total: entry.totalSize ?? entry.size };
});

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/bundle-sizes.json');

writeFileSync(
  out,
  `${JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), compression: 'brotli', baseline: BASELINE, presets }, null, 2)}\n`
);
console.log(`Wrote ${out}`);
