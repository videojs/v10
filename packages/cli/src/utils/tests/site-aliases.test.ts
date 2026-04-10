import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The CLI aliases source files from the site package via path aliases in
 * tsdown.config.ts and vitest.config.ts. If these files move, the CLI build
 * breaks silently. This test makes that failure loud.
 */
const SITE_ROOT = resolve(__dirname, '../../../../../site/src');

const ALIASED_FILES = [
  'utils/installation/codegen.ts',
  'utils/installation/types.ts',
  'utils/installation/cdn-code.ts',
  'utils/installation/detect-renderer.ts',
  'consts.ts',
];

describe('site source aliases', () => {
  for (const file of ALIASED_FILES) {
    it(`site/src/${file} exists`, () => {
      const fullPath = resolve(SITE_ROOT, file);
      expect(existsSync(fullPath), `Aliased site file missing: ${fullPath}`).toBe(true);
    });
  }
});
