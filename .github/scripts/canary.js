/**
 * Prepares and routes canary releases published from `main` by cd.yml.
 *
 * Every push to main that does not cut a release publishes the linked packages
 * as `<next patch>-canary.<UTC commit time>-<short sha>` under the `canary`
 * dist-tag. `next` follows `canary` unless it points at a minor or major
 * prerelease (alpha, beta, rc, ...) that has not shipped as `latest` yet.
 *
 * Usage:
 *   node .github/scripts/canary.js version            # rewrite manifests, print the canary version
 *   node .github/scripts/canary.js packages           # print public package names, one per line
 *   npm view @videojs/core dist-tags --json | node .github/scripts/canary.js follow-next
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RELEASE_CONFIG = '.github/release-please/release-please-config.json';
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/** The linked release version every public package shares. */
const VERSION_SOURCE = 'packages/core/package.json';

function parseVersion(version) {
  const match = SEMVER.exec(version ?? '');
  if (!match) return null;

  const [, major, minor, patch, prerelease] = match;
  return { core: [Number(major), Number(minor), Number(patch)], prerelease };
}

function compareCore(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }

  return 0;
}

export function isCanaryVersion(version) {
  return parseVersion(version)?.prerelease?.startsWith('canary.') ?? false;
}

/**
 * A stable base moves to the next patch so the canary sorts after it. A
 * prerelease base keeps its version core, which the prerelease is heading for.
 */
export function createCanaryVersion(baseVersion, timestamp, sha) {
  const parsed = parseVersion(baseVersion);
  if (!parsed) throw new Error(`Invalid base version: ${baseVersion}`);
  if (!/^\d{14}$/.test(timestamp)) throw new Error(`Invalid timestamp: ${timestamp}`);
  if (!/^[0-9a-f]{7,}$/.test(sha)) throw new Error(`Invalid commit sha: ${sha}`);

  const [major, minor, patch] = parsed.core;
  const core = parsed.prerelease ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch + 1}`;

  // A single alphanumeric identifier: a bare numeric sha identifier with a
  // leading zero would be invalid semver. The fixed-width timestamp keeps
  // canaries in publish order.
  return `${core}-canary.${timestamp}-${sha.slice(0, 7)}`;
}

/**
 * `next` belongs to a minor or major prerelease from the moment cd.yml
 * publishes it until a stable release at or past its version core ships.
 * Otherwise it follows `canary`.
 */
export function shouldNextFollowCanary(distTags) {
  const next = parseVersion(distTags?.next);
  if (!next?.prerelease || isCanaryVersion(distTags.next)) return true;

  const latest = parseVersion(distTags.latest);
  if (!latest) return false;

  return compareCore(next.core, latest.core) <= 0;
}

function readManifest(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** The packages release-please versions together, which are the ones a canary publishes. */
function discoverPackageManifests(root) {
  return Object.keys(readManifest(join(root, RELEASE_CONFIG)).packages).map((directory) =>
    join(root, directory, 'package.json')
  );
}

/** Rewrites every linked package to `canaryVersion`; pnpm resolves `workspace:` ranges from these at publish. */
export function writeCanaryVersion(root, canaryVersion) {
  for (const path of discoverPackageManifests(root)) {
    const manifest = readManifest(path);
    manifest.version = canaryVersion;
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

export function listPublicPackages(root) {
  return discoverPackageManifests(root)
    .map(readManifest)
    .filter((manifest) => manifest.name && !manifest.private)
    .map((manifest) => manifest.name)
    .sort();
}

function readCommit(root) {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const timestamp = execFileSync('git', ['log', '-1', '--format=%cd', '--date=format-local:%Y%m%d%H%M%S'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, TZ: 'UTC' },
  }).trim();

  return { sha, timestamp };
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : '';

if (scriptPath === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const command = process.argv[2];

  if (command === 'version') {
    const { sha, timestamp } = readCommit(root);
    const canaryVersion = createCanaryVersion(readManifest(join(root, VERSION_SOURCE)).version, timestamp, sha);

    writeCanaryVersion(root, canaryVersion);
    process.stdout.write(`${canaryVersion}\n`);
  } else if (command === 'packages') {
    process.stdout.write(`${listPublicPackages(root).join('\n')}\n`);
  } else if (command === 'follow-next') {
    const input = readFileSync(0, 'utf8').trim();
    process.stdout.write(`${shouldNextFollowCanary(input ? JSON.parse(input) : {})}\n`);
  } else {
    process.stderr.write('Usage: canary.js <version|packages|follow-next>\n');
    process.exit(1);
  }
}
