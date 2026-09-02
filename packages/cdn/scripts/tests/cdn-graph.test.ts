import { describe, expect, it } from 'vite-plus/test';

import { collectSpecifiers } from '../cdn-graph.ts';

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
