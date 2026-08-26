import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

/**
 * The CLI aliases source files from the site package via path aliases in vite.config.ts. If these aliases move, the CLI
 * build breaks silently. This test makes that failure loud.
 */
const SITE_ROOT = resolve(__dirname, '../../../../../site/src');

const ALIASED_FILES = [
  'utils/installation/codegen.ts',
  'utils/installation/types.ts',
  'utils/installation/cdn-code.ts',
  'utils/installation/detect-renderer.ts',
  'utils/installation/renderer-options.ts',
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
