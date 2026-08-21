#!/usr/bin/env node
/**
 * Builds the vendored custom Shaka Player bundle in `vendor/shaka/`.
 *
 * The published shaka-player package is a single Closure-compiled IIFE, so the
 * only way to shed the parts Video.js never uses (UI, cast, ads, offline,
 * queue, SRT) is to run Shaka's own build with those groups excluded. That
 * toolchain is deliberately kept out of the contributor workflow: this script
 * runs on demand, skips itself when the vendored artifact already matches the
 * installed shaka-player version, and `vendor/shaka/README.md` documents the
 * environment it needs (git, python3, Java 21+, network).
 *
 * Usage: pnpm -F @videojs/media build:shaka [--force]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync, constants as zlib } from 'node:zlib';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = path.join(packageRoot, 'vendor', 'shaka');
const buildInfoPath = path.join(vendorDir, 'build-info.json');
const cacheDir = path.join(packageRoot, 'node_modules', '.cache', 'shaka-build');
const checkoutDir = path.join(cacheDir, 'shaka-player');
const force = process.argv.includes('--force');

/** The build recipe. Changing anything here invalidates the vendored artifact. */
const LANGOUT = 'ECMASCRIPT_2021';
const GROUPS = [
  '+@complete',
  // Not part of Shaka's own published non-experimental bundles either.
  '-@msf',
  '-@dashJson',
  // Video.js renders its own UI.
  '-@ui',
  '-@polyfillForUI',
  // Video.js casts through its own CAF-based GoogleCast media, not CastProxy.
  '-@cast',
  // No ad manager integration. Note this also drops Shaka's own handling of
  // HLS/DASH interstitials, which live in the ads code.
  '-@ads',
  // No download-for-offline or playlist surface on the Shaka media.
  '-@offline',
  '-@queue',
  // In-manifest SRT/LRC parsers; sideloaded text goes through native tracks.
  '-@optionalText',
];

function fail(message) {
  console.error(`\n[build-shaka] ${message}`);
  console.error('[build-shaka] Environment requirements are documented in packages/media/vendor/shaka/README.md');
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) fail(`\`${command} ${args.join(' ')}\` failed (exit ${result.status ?? 'signal'}).`);
}

function tryCapture(command, args) {
  try {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.status !== 0) return null;
    return `${result.stdout}${result.stderr}`;
  } catch {
    return null;
  }
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

// --- Which shaka version should the artifact match? The installed devDependency. ---
const require = createRequire(path.join(packageRoot, 'package.json'));
let shakaVersion;
try {
  shakaVersion = require('shaka-player/package.json').version;
} catch {
  fail('shaka-player is not installed. Run `pnpm install` first.');
}

// --- Skip when the vendored artifact already matches. ---
const jsPath = path.join(vendorDir, 'shaka-player.vjs.js');
const dtsPath = path.join(vendorDir, 'shaka-player.vjs.d.ts');

if (!force && existsSync(buildInfoPath) && existsSync(jsPath) && existsSync(dtsPath)) {
  try {
    const info = JSON.parse(readFileSync(buildInfoPath, 'utf8'));
    const upToDate =
      info.shakaVersion === shakaVersion &&
      info.langout === LANGOUT &&
      JSON.stringify(info.groups) === JSON.stringify(GROUPS) &&
      info.artifacts?.js?.sha256 === sha256(readFileSync(jsPath)) &&
      info.artifacts?.dts?.sha256 === sha256(readFileSync(dtsPath));
    if (upToDate) {
      console.log(`[build-shaka] vendor/shaka already matches shaka-player ${shakaVersion}; nothing to do.`);
      console.log('[build-shaka] Pass --force to rebuild anyway.');
      process.exit(0);
    }
  } catch {
    // Unreadable build info — fall through to a rebuild.
  }
}

// --- Prerequisites. ---
if (!tryCapture('git', ['--version'])) fail('git is required.');
if (!tryCapture('python3', ['--version'])) fail('python3 is required (stdlib only — no pip packages).');

const javaVersionOutput = tryCapture('java', ['-version']);
const javaMajor = (() => {
  const match = javaVersionOutput?.match(/version "(?:1\.)?(\d+)/);
  return match ? Number(match[1]) : null;
})();
if (!javaMajor) fail('java is required (Temurin 21+ recommended).');
if (javaMajor < 21) {
  fail(
    `Java ${javaMajor} found, but Shaka's pinned Closure Compiler needs Java 21+. ` +
      'Install Temurin 21+ or point JAVA_HOME/PATH at one for this command.'
  );
}

// --- Check out shaka-player at the exact installed version. ---
const tag = `v${shakaVersion}`;
const existingTag = existsSync(checkoutDir)
  ? tryCapture('git', ['-C', checkoutDir, 'describe', '--tags', '--exact-match'])?.trim()
  : null;

if (existingTag !== tag) {
  console.log(`[build-shaka] Cloning shaka-player ${tag}...`);
  rmSync(checkoutDir, { recursive: true, force: true });
  mkdirSync(cacheDir, { recursive: true });
  run('git', [
    'clone',
    '--depth',
    '1',
    '--branch',
    tag,
    'https://github.com/shaka-project/shaka-player.git',
    checkoutDir,
  ]);
} else {
  console.log(`[build-shaka] Reusing cached shaka-player checkout at ${tag}.`);
}

// --- Build. build.py installs the checkout's npm deps itself (npm ci) on first run. ---
console.log(`[build-shaka] Compiling (${LANGOUT}, release)... this takes a few minutes.`);
run(
  'python3',
  ['build/build.py', '--name', 'vjs', '--langout', LANGOUT, '--mode', 'release', '--skip-worker', ...GROUPS],
  { cwd: checkoutDir }
);

// --- Vendor the artifacts. ---
mkdirSync(vendorDir, { recursive: true });
const previousBytes = existsSync(jsPath) ? readFileSync(jsPath).length : null;
// The vendored copy is converted to a real ES module, because every consumer
// here — Node's ESM loader, Vite's dev server on a linked workspace package,
// and production bundlers — must agree on how to read it, and only genuine
// ESM does that. Shaka's UMD wrapper feature-detects `exports`, so shadowing
// `module`/`exports` with module-scoped locals captures the namespace, and an
// appended `export default` hands it out. The wrapper (and Closure output)
// also reads the browser global `self` while it evaluates, which server
// runtimes do not define; the first line shims it for exactly the duration of
// that evaluation.
const rawJs = readFileSync(path.join(checkoutDir, 'dist', 'shaka-player.vjs.js'), 'utf8');
writeFileSync(
  jsPath,
  [
    "var __vjsSelfShim = typeof self === 'undefined' && (globalThis.self = globalThis, !0);",
    'var module = { exports: {} };',
    'var exports = module.exports;',
    rawJs,
    'if (__vjsSelfShim) { __vjsSelfShim = !1; delete globalThis.self; }',
    'export default exports;',
    '',
  ].join('\n')
);
cpSync(path.join(checkoutDir, 'dist', 'shaka-player.vjs.d.ts'), dtsPath);
cpSync(path.join(checkoutDir, 'LICENSE'), path.join(vendorDir, 'LICENSE'));

const js = readFileSync(jsPath);
const dts = readFileSync(dtsPath);

writeFileSync(
  buildInfoPath,
  `${JSON.stringify(
    {
      shakaVersion,
      langout: LANGOUT,
      groups: GROUPS,
      artifacts: {
        js: { file: 'shaka-player.vjs.js', bytes: js.length, sha256: sha256(js) },
        dts: { file: 'shaka-player.vjs.d.ts', bytes: dts.length, sha256: sha256(dts) },
      },
    },
    null,
    2
  )}\n`
);

const gzipped = gzipSync(js, { level: 9 }).length;
const brotlied = brotliCompressSync(js, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11 } }).length;
console.log(`\n[build-shaka] Vendored shaka-player ${shakaVersion}:`);
console.log(`[build-shaka]   raw ${kb(js.length)} | gzip ${kb(gzipped)} | brotli ${kb(brotlied)}`);
if (previousBytes !== null && previousBytes !== js.length) {
  console.log(`[build-shaka]   raw size change: ${kb(previousBytes)} -> ${kb(js.length)}`);
}
console.log('[build-shaka] Done. Commit vendor/shaka/* alongside the shaka-player version bump.');
