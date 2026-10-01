import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  createCanaryVersion,
  isCanaryVersion,
  listPublicPackages,
  shouldNextFollowCanary,
  writeCanaryVersion,
} from '../canary.js';

const SHA = '0123456789abcdef0123456789abcdef01234567';

describe('createCanaryVersion', () => {
  it('targets the next patch after a stable release', () => {
    assert.equal(createCanaryVersion('10.0.0', '20261001093000', SHA), '10.0.1-canary.20261001093000-0123456');
  });

  it('keeps the version core of an in-progress prerelease', () => {
    assert.equal(createCanaryVersion('10.1.0-rc.2', '20261001093000', SHA), '10.1.0-canary.20261001093000-0123456');
  });

  it('sorts canaries by commit time', () => {
    const earlier = createCanaryVersion('10.0.0', '20261001093000', 'fffffff');
    const later = createCanaryVersion('10.0.0', '20261001093001', '0000000');

    assert.ok(earlier < later);
  });

  it('rejects malformed input', () => {
    assert.throws(() => createCanaryVersion('10.0', '20261001093000', SHA));
    assert.throws(() => createCanaryVersion('10.0.0', '2026-10-01', SHA));
    assert.throws(() => createCanaryVersion('10.0.0', '20261001093000', 'main'));
  });
});

describe('isCanaryVersion', () => {
  it('matches canary prereleases only', () => {
    assert.equal(isCanaryVersion('10.0.1-canary.20261001093000-0123456'), true);
    assert.equal(isCanaryVersion('10.1.0-rc.0'), false);
    assert.equal(isCanaryVersion('10.0.0'), false);
    assert.equal(isCanaryVersion(undefined), false);
  });
});

describe('shouldNextFollowCanary', () => {
  it('follows canary when next is missing', () => {
    assert.equal(shouldNextFollowCanary({ latest: '10.0.0' }), true);
  });

  it('follows canary when next is already a canary', () => {
    assert.equal(shouldNextFollowCanary({ latest: '10.0.0', next: '10.0.1-canary.20261001093000-0123456' }), true);
  });

  it('leaves an unreleased minor or major prerelease on next', () => {
    assert.equal(shouldNextFollowCanary({ latest: '10.0.0', next: '10.1.0-beta.0' }), false);
    assert.equal(shouldNextFollowCanary({ latest: '10.4.2', next: '11.0.0-rc.3' }), false);
  });

  it('reclaims next once the prerelease has shipped as stable', () => {
    assert.equal(shouldNextFollowCanary({ latest: '10.1.0', next: '10.1.0-rc.3' }), true);
    assert.equal(shouldNextFollowCanary({ latest: '10.2.0', next: '10.1.0-rc.3' }), true);
  });

  it('reclaims next from a stable version', () => {
    assert.equal(shouldNextFollowCanary({ latest: '10.0.0', next: '10.0.0' }), true);
  });

  it('leaves a prerelease on next when latest is unknown', () => {
    assert.equal(shouldNextFollowCanary({ next: '10.1.0-rc.0' }), false);
  });
});

function createWorkspace() {
  const root = mkdtempSync(join(tmpdir(), 'canary-'));
  const packages = {
    'packages/core': { name: '@videojs/core', version: '10.0.0' },
    'packages/video.js': { name: 'video.js', version: '10.0.0', private: true },
  };

  mkdirSync(join(root, '.github/release-please'), { recursive: true });
  writeFileSync(
    join(root, '.github/release-please/release-please-config.json'),
    JSON.stringify({ packages: Object.fromEntries(Object.keys(packages).map((dir) => [dir, {}])) })
  );

  for (const [dir, manifest] of Object.entries(packages)) {
    mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, dir, 'package.json'), JSON.stringify(manifest));
  }

  return root;
}

describe('writeCanaryVersion', () => {
  it('rewrites every released package', () => {
    const root = createWorkspace();

    writeCanaryVersion(root, '10.0.1-canary.20261001093000-0123456');

    for (const dir of ['packages/core', 'packages/video.js']) {
      const manifest = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
      assert.equal(manifest.version, '10.0.1-canary.20261001093000-0123456');
    }
  });
});

describe('listPublicPackages', () => {
  it('omits private packages', () => {
    assert.deepEqual(listPublicPackages(createWorkspace()), ['@videojs/core']);
  });
});
