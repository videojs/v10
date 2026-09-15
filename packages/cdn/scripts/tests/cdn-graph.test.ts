import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vite-plus/test';

import { collectSpecifiers, findUnresolvableSpecifiers, resolveClosure } from '../cdn-graph.ts';

const temporaryDirectories: string[] = [];

function createFixture(files: Record<string, string>): string {
  const directory = mkdtempSync(join(tmpdir(), 'videojs-cdn-graph-'));

  temporaryDirectories.push(directory);

  for (const [file, contents] of Object.entries(files)) {
    const path = join(directory, file);

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }

  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('collectSpecifiers', () => {
  it('collects static and dynamic specifiers', () => {
    const code = [
      'import { a } from "./chunk-a.js";',
      'export { b } from "./chunk-b.js";',
      'const c = await import("./chunk-c.js");',
    ].join('\n');

    expect(collectSpecifiers(code)).toEqual(['./chunk-a.js', './chunk-b.js', './chunk-c.js']);
  });

  it('ignores type imports in JSDoc without hiding the code around them', () => {
    const code = [
      'import { a } from "./chunk-a.js";',
      "/** @typedef {import('./player.types').PlayerControls} PlayerControls */",
      "/** @typedef {import('timing-object').ITimingObject} TimingObject */",
      'const b = await import("./chunk-b.js");',
    ].join('\n');

    expect(collectSpecifiers(code)).toEqual(['./chunk-a.js', './chunk-b.js']);
  });

  it('ignores prose that reads like a specifier', () => {
    expect(collectSpecifiers('// Re-exported from "the store package"')).toEqual([]);
    expect(collectSpecifiers('throw new Error(`imported from "${name}"`)')).toEqual([]);
  });
});

describe('resolveClosure', () => {
  it('follows relative imports once and returns build-relative paths', () => {
    const directory = createFixture({
      'entry.js': 'import "./chunks/a.js"; import "./chunks/a.js";',
      'chunks/a.js': 'export { value } from "./b.js";',
      'chunks/b.js': 'export const value = 1;',
    });

    expect(resolveClosure(directory, ['entry.js'])).toEqual(new Set(['entry.js', 'chunks/a.js', 'chunks/b.js']));
  });

  it('rejects imports that escape the build before following them', () => {
    const directory = createFixture({
      'build/entry.js': 'import "../outside.js";',
      'outside.js': 'export const value = 1;',
    });

    expect(() => resolveClosure(join(directory, 'build'), ['entry.js'])).toThrow(
      'entry.js: "../outside.js" resolves outside the build (../outside.js)'
    );
  });

  it('reports missing files in the reachable graph', () => {
    const directory = createFixture({
      'entry.js': 'import "./missing.js";',
    });

    expect(() => resolveClosure(directory, ['entry.js'])).toThrow(
      'Expected bundle is missing from the build: missing.js'
    );
  });
});

describe('findUnresolvableSpecifiers', () => {
  it('accepts existing relative imports inside the build', () => {
    const directory = createFixture({
      'entry.js': 'import "./chunks/a.js";',
      'chunks/a.js': 'export const value = 1;',
    });

    expect(findUnresolvableSpecifiers(directory, ['entry.js'])).toEqual([]);
  });

  it('reports absolute, bare, outside, and missing specifiers', () => {
    const directory = createFixture({
      'build/entry.js': [
        'import "https://cdn.example.com/player.js";',
        'import "external-package";',
        'import "../outside.js";',
        'import "./missing.js";',
      ].join('\n'),
      'outside.js': 'export const value = 1;',
    });

    expect(findUnresolvableSpecifiers(join(directory, 'build'), ['entry.js'])).toEqual([
      'entry.js: absolute specifier "https://cdn.example.com/player.js"',
      'entry.js: bare specifier "external-package"',
      'entry.js: "../outside.js" resolves outside the build (../outside.js)',
      'entry.js: missing relative specifier "./missing.js" (missing.js)',
    ]);
  });
});
