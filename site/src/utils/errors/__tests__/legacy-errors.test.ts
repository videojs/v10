import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { getLegacyErrorUrl, LEGACY_ERROR_CODES } from 'video.js/errors';
import { describe, expect, it } from 'vite-plus/test';

import { LEGACY_ERROR_REFERENCE_PATH, getLegacyErrorPages } from '../legacy-errors';

describe('getLegacyErrorPages', () => {
  const pages = getLegacyErrorPages();

  it('lists one page per registered code, in registry order', () => {
    expect(pages.map((page) => page.code)).toEqual([...LEGACY_ERROR_CODES]);
  });

  it('places every page at the path the thrown message points to', () => {
    for (const page of pages) {
      expect(new URL(getLegacyErrorUrl(page.code)).pathname, page.code).toBe(page.path);
      const referenceFile = resolve('src/content/docs/reference/api', `${page.slug}.mdx`);

      expect(existsSync(referenceFile), page.code).toBe(true);
    }
  });

  it('uses the framework-neutral docs route', () => {
    for (const page of pages) {
      expect(page.path, page.code).toMatch(new RegExp(`^${LEGACY_ERROR_REFERENCE_PATH}/[a-z0-9-]+$`));
    }

    expect(new Set(pages.map((page) => page.path)).size).toBe(pages.length);
  });
});
