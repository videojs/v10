import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPackageTestSelection,
  createPackageTestShards,
  selectAffectedPackageNames,
} from '../package-test-matrix.js';

function workspacePackage(name, directory, dependencies = [], test = true) {
  return {
    name,
    directory,
    dependencies: new Set(dependencies),
    scripts: test ? { test: 'vp test run' } : {},
  };
}

const workspacePackages = [
  workspacePackage('@videojs/utils', 'packages/utils'),
  workspacePackage('@videojs/media', 'packages/media', ['@videojs/utils']),
  workspacePackage('@videojs/core', 'packages/core', ['@videojs/media']),
  workspacePackage('@videojs/react', 'packages/react', ['@videojs/core']),
  workspacePackage('@videojs/spf', 'packages/spf', ['@videojs/media']),
  workspacePackage('@videojs/sandbox', 'apps/sandbox', ['@videojs/react']),
  workspacePackage('@videojs/e2e', 'apps/e2e', ['@videojs/react'], false),
  workspacePackage('site', 'site', ['@videojs/react'], false),
];

describe('selectAffectedPackageNames', () => {
  it('selects a changed package and its transitive dependents', () => {
    const selected = selectAffectedPackageNames(workspacePackages, ['packages/media/src/index.ts']);

    assert.deepEqual(selected, [
      '@videojs/core',
      '@videojs/media',
      '@videojs/react',
      '@videojs/sandbox',
      '@videojs/spf',
    ]);
  });

  it('does not select dependency tests when only a dependent changed', () => {
    const selected = selectAffectedPackageNames(workspacePackages, ['packages/react/src/player.tsx']);

    assert.deepEqual(selected, ['@videojs/react', '@videojs/sandbox']);
  });

  it('ignores changes owned by separately tested workspaces', () => {
    const selected = selectAffectedPackageNames(workspacePackages, ['apps/e2e/suites/player/player.test.ts']);

    assert.deepEqual(selected, []);
  });

  it('selects every test for shared toolchain changes', () => {
    const selected = selectAffectedPackageNames(workspacePackages, ['build/task.ts']);

    assert.deepEqual(selected, [
      '@videojs/core',
      '@videojs/media',
      '@videojs/react',
      '@videojs/sandbox',
      '@videojs/spf',
      '@videojs/utils',
    ]);
  });

  it('falls back to every test for an unknown package path', () => {
    const selected = selectAffectedPackageNames(workspacePackages, ['packages/removed/src/index.ts']);

    assert.equal(selected.length, 6);
  });
});

describe('createPackageTestShards', () => {
  it('limits fan-out and keeps every package in exactly one shard', () => {
    const packages = Array.from({ length: 23 }, (_, index) => `package-${index}`);
    const shards = createPackageTestShards(packages);
    const selected = shards.flatMap((shard) => shard.packages);

    assert.equal(shards.length, 4);
    assert.deepEqual(selected.sort(), packages.sort());
  });
});

describe('createPackageTestSelection', () => {
  it('discovers every current package test and separates SPF for its container', () => {
    const selection = createPackageTestSelection({
      root: new URL('../../..', import.meta.url).pathname,
      forceAll: true,
    });
    const standardPackages = selection.matrix.include.flatMap((shard) => shard.packages);

    assert.equal(selection.runSpf, true);
    assert.equal(selection.hasStandardTests, true);
    assert.ok(selection.affected.includes('@videojs/spf'));
    assert.ok(standardPackages.includes('@videojs/react'));
    assert.ok(standardPackages.includes('@videojs/sandbox'));
    assert.ok(!standardPackages.includes('@videojs/spf'));
    assert.equal(new Set([...standardPackages, '@videojs/spf']).size, selection.affected.length);
  });
});
