// @vitest-environment node
import { globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vite-plus/test';

const cdnSrc = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlDefine = resolve(cdnSrc, '../../html/src/define');

/** Entry names under a directory: `<name>` for a file, `<name>` and `<name>/<flavor>` for a directory of flavors. */
function entryNames(dir: string): string[] {
  return globSync('**/*.ts', { cwd: dir })
    .filter((file) => !file.startsWith('tests/'))
    .map((file) => file.replace(/\/index\.ts$/, '').replace(/\.ts$/, ''))
    .sort();
}

describe('cdn entries', () => {
  for (const subpath of ['media', 'extensions'] as const) {
    it(`ships one ${subpath} bundle per @videojs/html definition`, () => {
      expect(entryNames(resolve(cdnSrc, subpath))).toEqual(entryNames(resolve(htmlDefine, subpath)));
    });

    it(`imports each ${subpath} entry from the @videojs/html package`, () => {
      for (const file of globSync(`${subpath}/**/*.ts`, { cwd: cdnSrc })) {
        const name = file
          .replace(/^[a-z]+\//, '')
          .replace(/\/index\.ts$/, '')
          .replace(/\.ts$/, '');

        expect(readFileSync(resolve(cdnSrc, file), 'utf8').trim()).toBe(`import '@videojs/html/${subpath}/${name}';`);
      }
    });
  }
});
