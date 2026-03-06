/**
 * Measures bundle sizes for all packages.
 *
 * Auto-discovers packages from `packages/`, reads their `exports` field to find
 * entry points, and externalizes `peerDependencies`.
 *
 * All sizes are standalone totals (minified + brotli).
 *
 * Wildcard exports (e.g., `./ui/*`, `./media/⁕/index.js`) are resolved to
 * actual files on disk. Supports both file-level (`*.js`) and directory-level
 * (`⁕/index.js`) wildcards.
 *
 * CSS files are minified with esbuild then brotli-compressed.
 *
 * Each entry includes a `category` field for grouped reporting in html/react:
 * preset, media, player, skin, ui, or feature.
 *
 * Usage: node .github/scripts/bundle-size.js [--json output.json]
 */

import { build, transform } from 'esbuild';
import { brotliCompressSync, constants } from 'node:zlib';
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const PACKAGES_DIR = join(ROOT, 'packages');

const SKIP_PACKAGES = new Set([
  'sandbox',
  '__tech-preview__',
  'react-native',
  'skins',
  'icons',
]);

/** Packages that get categorized breakdowns in the report. */
const CATEGORIZED_PACKAGES = new Set(['html', 'react']);

/** UI compound component parts — excluded from the report. */
const UI_PARTS = new Set([
  'controls-group',
  'slider-buffer',
  'slider-fill',
  'slider-thumb',
  'slider-thumbnail',
  'slider-track',
  'slider-value',
  'time-group',
  'time-separator',
  'tooltip-group',
]);

/**
 * Preset virtual bundle definitions.
 *
 * Each preset combines skin + player (HTML) or skin + media + features (React)
 * into a single virtual entry to measure realistic per-skin configuration costs.
 *
 * @type {Array<{ label: string, preset: string, skin: string, hls: boolean }>}
 */
const PRESET_CONFIGS = [
  { label: '/video (default)', preset: 'video', skin: 'skin', hls: false },
  { label: '/video (default + hls)', preset: 'video', skin: 'skin', hls: true },
  { label: '/video (minimal)', preset: 'video', skin: 'minimal-skin', hls: false },
  { label: '/video (minimal + hls)', preset: 'video', skin: 'minimal-skin', hls: true },
  { label: '/audio (default)', preset: 'audio', skin: 'skin', hls: false },
  { label: '/audio (minimal)', preset: 'audio', skin: 'minimal-skin', hls: false },
  { label: '/background', preset: 'background', skin: 'skin', hls: false },
];

/**
 * Export name lookup tables for preset virtual bundles.
 *
 * Each key is `{preset}/{variant}` where variant is 'skin', 'player', 'media',
 * 'hls-media', or 'features'. Values are `{ path, name }` where path is relative
 * to the package dist/default/ directory and name is the exported identifier.
 */
const PRESET_EXPORTS = {
  html: {
    'video/skin': { path: 'define/video/skin.js', name: 'VideoSkinElement' },
    'video/minimal-skin': { path: 'define/video/minimal-skin.js', name: 'MinimalVideoSkinElement' },
    'video/player': { path: 'define/video/player.js', name: 'VideoPlayerElement' },
    'audio/skin': { path: 'define/audio/skin.js', name: 'AudioSkinElement' },
    'audio/minimal-skin': { path: 'define/audio/minimal-skin.js', name: 'MinimalAudioSkinElement' },
    'audio/player': { path: 'define/audio/player.js', name: 'AudioPlayerElement' },
    'background/skin': { path: 'define/background/skin.js', name: 'BackgroundVideoSkinElement' },
    'background/player': { path: 'define/background/player.js', name: 'BackgroundVideoPlayerElement' },
    'hls-media': { path: 'define/media/hls-video.js', name: 'HlsVideoElement' },
  },
  react: {
    'video/skin': { path: 'presets/video/skin.js', name: 'VideoSkin' },
    'video/minimal-skin': { path: 'presets/video/minimal-skin.js', name: 'MinimalVideoSkin' },
    'video/media': { path: 'media/video.js', name: 'Video' },
    'audio/skin': { path: 'presets/audio/skin.js', name: 'AudioSkin' },
    'audio/minimal-skin': { path: 'presets/audio/minimal-skin.js', name: 'MinimalAudioSkin' },
    'audio/media': { path: 'media/audio.js', name: 'Audio' },
    'background/skin': { path: 'presets/background/skin.js', name: 'BackgroundVideoSkin' },
    'background/media': { path: 'media/background-video/index.js', name: 'BackgroundVideo' },
    'hls-media': { path: 'media/hls-video/index.js', name: 'HlsVideo' },
    'video/features': { path: '../../../core/dist/default/dom/store/features/presets.js', name: 'videoFeatures' },
    'audio/features': { path: '../../../core/dist/default/dom/store/features/presets.js', name: 'audioFeatures' },
    'background/features': { path: '../../../core/dist/default/dom/store/features/presets.js', name: 'backgroundFeatures' },
  },
};

/**
 * Build virtual entry source code for a preset configuration.
 *
 * Returns an import/export string that re-exports the skin, player/media,
 * features, and optional HLS media for the given preset. Returns null if
 * any required file is missing on disk.
 */
function buildPresetEntry(pkgShortName, config, distDir) {
  const table = PRESET_EXPORTS[pkgShortName];
  if (!table) return null;

  const lines = [];

  function addExport(key) {
    const entry = table[key];
    // Key not in lookup → not applicable for this package type (e.g., HTML
    // has no media/features entries). Skip without aborting.
    if (!entry) return true;
    const fullPath = resolve(distDir, entry.path);
    if (!existsSync(fullPath)) return false;
    lines.push(`export { ${entry.name} } from './${entry.path}';`);
    return true;
  }

  if (!addExport(`${config.preset}/${config.skin}`)) return null;
  if (!addExport(`${config.preset}/player`)) return null;
  if (!addExport(`${config.preset}/media`)) return null;
  if (!addExport(`${config.preset}/features`)) return null;
  if (config.hls && !addExport('hls-media')) return null;

  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * @typedef {object} SizeEntry
 * @property {string} name
 * @property {number} size
 * @property {'root' | 'subpath'} type
 * @property {string} [category] - preset, media, player, skin, ui, feature (only for html/react)
 * @property {'js' | 'css'} format
 */

/** Bundle entry points with esbuild and return the minified + brotli size. */
async function measure(entryPoints, external = []) {
  const result = await build({
    entryPoints,
    bundle: true,
    minify: true,
    treeShaking: true,
    format: 'esm',
    write: false,
    outdir: '/tmp/bundle-size-out',
    external,
    logLevel: 'silent',
  });

  const code = result.outputFiles.map((f) => f.text).join('');
  const compressed = brotliCompressSync(Buffer.from(code), {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
    },
  });

  return compressed.length;
}

/** Minify a CSS file with esbuild then brotli-compress it. */
async function measureCSS(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const result = await transform(content, { loader: 'css', minify: true });
  const compressed = brotliCompressSync(Buffer.from(result.code), {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
    },
  });
  return compressed.length;
}

/** Bundle a virtual entry (source string) with esbuild and return the minified + brotli size. */
async function measureVirtual(code, resolveDir, external = []) {
  const result = await build({
    stdin: { contents: code, resolveDir, loader: 'js' },
    bundle: true,
    minify: true,
    treeShaking: true,
    format: 'esm',
    write: false,
    outdir: '/tmp/bundle-size-out',
    external,
    logLevel: 'silent',
  });

  const output = result.outputFiles.map((f) => f.text).join('');
  const compressed = brotliCompressSync(Buffer.from(output), {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
    },
  });

  return compressed.length;
}

/**
 * Resolve the `default` condition from an export value.
 * Handles both `{ default: "./dist/..." }` objects and plain string values.
 */
function resolveDefault(exportValue) {
  if (typeof exportValue === 'string') return exportValue;
  if (typeof exportValue === 'object' && exportValue !== null) {
    return exportValue.default ?? null;
  }
  return null;
}

/**
 * Categorize an entry by its full name.
 *
 * Returns a category string for html/react packages, undefined for other
 * packages (they use flat breakdowns), or '_skip' for internal entries
 * in categorized packages that should be excluded.
 */
function categorize(name) {
  const match = name.match(/^@videojs\/([^/]+)(\/.*)?$/);
  if (!match) return undefined;

  const pkg = match[1];
  const subpath = match[2] ?? '';

  if (!CATEGORIZED_PACKAGES.has(pkg)) return undefined;

  // CSS files are always skin-related
  if (name.endsWith('.css')) return 'skin';

  // Root and combined preset entries are skipped — the presets category is
  // populated by virtual bundles measured separately.
  if (subpath === '' || /^\/(video|audio|background)$/.test(subpath)) {
    return '_skip';
  }
  if (subpath.startsWith('/media/')) return 'media';
  if (subpath.startsWith('/ui/')) {
    // Skip compound component parts — only show main entries
    const uiName = subpath.slice('/ui/'.length);
    if (UI_PARTS.has(uiName)) return '_skip';
    return 'ui';
  }
  if (subpath.startsWith('/feature/')) return 'feature';

  // Match skin entries but exclude internal utilities like skin-mixin
  if (/skin/i.test(subpath) && !/mixin/i.test(subpath)) return 'skin';

  if (/\/player$/.test(subpath)) return 'player';

  // Unrecognized entry in a categorized package (internal utility) — skip
  return '_skip';
}

/**
 * Resolve a wildcard export key to actual files on disk.
 *
 * Handles both file-level wildcards (e.g., `./ui/*.js` where `*` is a
 * filename stem) and directory-level wildcards (e.g., `./media/⁕/index.js`
 * where `*` is a directory name).
 */
function resolveWildcard(pkgDir, exportKey, exportValue) {
  const defaultPath = resolveDefault(exportValue);
  if (!defaultPath) return [];

  const isCSS = exportKey.endsWith('.css');
  const fullPattern = resolve(pkgDir, defaultPath);

  const starIdx = fullPattern.indexOf('*');
  if (starIdx === -1) return [];

  // Find the directory that contains the wildcard
  const lastSlash = fullPattern.lastIndexOf('/', starIdx);
  const scanDir = fullPattern.slice(0, lastSlash);
  const prefix = fullPattern.slice(lastSlash + 1, starIdx);
  const suffix = fullPattern.slice(starIdx + 1);

  if (!existsSync(scanDir)) return [];

  // Directory pattern: `*/index.js` — * is a directory name
  // File pattern: `*.js` — * is a filename stem
  const isDirectoryPattern = suffix.startsWith('/');

  return readdirSync(scanDir, { withFileTypes: true })
    .filter((d) => {
      if (!d.name.startsWith(prefix)) return false;
      return isDirectoryPattern ? d.isDirectory() : d.isFile();
    })
    .filter((d) => {
      if (isDirectoryPattern) return true;
      // For file patterns, the filename must end with the suffix
      return d.name.endsWith(suffix);
    })
    .map((d) => {
      const stem = isDirectoryPattern
        ? d.name.slice(prefix.length)
        : d.name.slice(prefix.length, d.name.length - suffix.length);
      const fullPath = fullPattern.replace('*', stem);
      return { stem, fullPath };
    })
    .filter(({ fullPath }) => {
      if (!existsSync(fullPath)) return false;
      if (fullPath.includes('.test.')) return false;
      return readFileSync(fullPath, 'utf8').trim().length > 0;
    })
    .sort((a, b) => a.stem.localeCompare(b.stem))
    .map(({ stem, fullPath }) => ({
      exportKey: exportKey.replace('*', stem),
      path: fullPath,
      isCSS,
    }));
}

/** Discover packages and their entry points from the filesystem. */
function discoverPackages() {
  const packages = [];

  for (const dirName of readdirSync(PACKAGES_DIR).sort()) {
    if (SKIP_PACKAGES.has(dirName)) continue;

    const pkgJsonPath = join(PACKAGES_DIR, dirName, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    if (!pkgJson.exports) continue;

    const pkgName = pkgJson.name;
    const pkgDir = join(PACKAGES_DIR, dirName);
    const external = pkgJson.peerDependencies
      ? Object.keys(pkgJson.peerDependencies)
      : [];

    let rootPath = null;
    const subpaths = [];

    for (const [key, value] of Object.entries(pkgJson.exports)) {
      if (key.includes('*')) {
        for (const r of resolveWildcard(pkgDir, key, value)) {
          subpaths.push({
            name: `${pkgName}${r.exportKey.slice(1)}`,
            path: r.path,
            isCSS: r.isCSS,
          });
        }
        continue;
      }

      const defaultPath = resolveDefault(value);
      if (!defaultPath) continue;

      // Skip types-only exports (no runtime code)
      if (defaultPath.endsWith('.d.ts')) continue;

      const absolutePath = resolve(pkgDir, defaultPath);
      if (!existsSync(absolutePath)) continue;

      // Skip empty files (types-only exports with no runtime code)
      if (readFileSync(absolutePath, 'utf8').trim().length === 0) continue;

      if (key === '.') {
        rootPath = absolutePath;
      } else {
        subpaths.push({
          name: `${pkgName}${key.slice(1)}`,
          path: absolutePath,
          isCSS: false,
        });
      }
    }

    // For categorized packages, scan dist/ui/ for components not already
    // discovered from exports (e.g., React tree-shakes UI from root).
    if (rootPath && CATEGORIZED_PACKAGES.has(dirName)) {
      const uiDir = join(dirname(rootPath), 'ui');
      if (existsSync(uiDir)) {
        const existing = new Set(subpaths.map((s) => s.name));
        for (const d of readdirSync(uiDir, { withFileTypes: true })) {
          if (!d.isDirectory()) continue;
          if (UI_PARTS.has(d.name)) continue;
          const indexPath = join(uiDir, d.name, 'index.js');
          if (!existsSync(indexPath)) continue;
          const name = `${pkgName}/ui/${d.name}`;
          if (existing.has(name)) continue;
          subpaths.push({ name, path: indexPath, isCSS: false });
        }
      }
    }

    if (rootPath) {
      packages.push({ name: pkgName, rootPath, external, subpaths });
    } else if (subpaths.length > 0) {
      // Package with only subpath exports (e.g., @videojs/utils)
      // Each subpath is measured as an independent root
      for (const sub of subpaths) {
        packages.push({
          name: sub.name,
          rootPath: sub.path,
          external,
          subpaths: [],
        });
      }
    }
  }

  return packages;
}

async function main() {
  const packages = discoverPackages();

  /** @type {SizeEntry[]} */
  const results = [];

  for (const pkg of packages) {
    const isRootCSS = pkg.rootPath.endsWith('.css');

    if (isRootCSS) {
      const cat = categorize(pkg.name);
      if (cat === '_skip') continue;

      results.push({
        name: pkg.name,
        size: await measureCSS(pkg.rootPath),
        type: 'root',
        ...(cat ? { category: cat } : {}),
        format: 'css',
      });
      continue;
    }

    const rootCat = categorize(pkg.name);

    // Always measure root — needed for UI marginal calculations even when
    // the root itself is excluded from results (categorized packages skip
    // root because presets are measured as virtual bundles instead).
    const rootSize = await measure([pkg.rootPath], pkg.external);

    if (rootCat !== '_skip') {
      results.push({
        name: pkg.name,
        size: rootSize,
        type: 'root',
        ...(rootCat ? { category: rootCat } : {}),
        format: 'js',
      });
    }

    for (const sub of pkg.subpaths) {
      const cat = categorize(sub.name);
      if (cat === '_skip') continue;

      if (sub.isCSS) {
        results.push({
          name: sub.name,
          size: await measureCSS(sub.path),
          type: 'subpath',
          ...(cat ? { category: cat } : {}),
          format: 'css',
        });
        continue;
      }

      // UI components are marginal over root (they share base element classes).
      // Everything else is standalone.
      let size;
      if (cat === 'ui') {
        const combined = await measure([pkg.rootPath, sub.path], pkg.external);
        size = combined - rootSize;
      } else {
        size = await measure([sub.path], pkg.external);
      }

      results.push({
        name: sub.name,
        size,
        type: 'subpath',
        ...(cat ? { category: cat } : {}),
        format: 'js',
      });
    }

    // Measure preset virtual bundles for categorized packages.
    const pkgShortName = pkg.name.replace('@videojs/', '');
    if (CATEGORIZED_PACKAGES.has(pkgShortName)) {
      const distDir = dirname(pkg.rootPath);

      for (const config of PRESET_CONFIGS) {
        const code = buildPresetEntry(pkgShortName, config, distDir);
        if (!code) continue;

        const size = await measureVirtual(code, distDir, pkg.external);
        results.push({
          name: `${pkg.name}${config.label}`,
          size,
          type: 'subpath',
          category: 'preset',
          format: 'js',
        });
      }
    }
  }

  // Parse --json flag
  const jsonIndex = process.argv.indexOf('--json');
  const outputPath = jsonIndex !== -1 ? process.argv[jsonIndex + 1] : null;

  const output = JSON.stringify(results, null, 2);

  if (outputPath) {
    writeFileSync(outputPath, output);
    console.log(`Written to ${outputPath}`);
  } else {
    console.log(output);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
