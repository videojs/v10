import { getLegacyErrorUrl, LEGACY_ERROR_CODES } from 'video.js/errors';
import { describe, expect, it } from 'vite-plus/test';

import { ERRORS_BASE_PATH, getLegacyErrorPages } from '../legacy-errors';

describe('getLegacyErrorPages', () => {
  const pages = getLegacyErrorPages();

  it('renders one page per registered code, in registry order', () => {
    expect(pages.map((page) => page.code)).toEqual([...LEGACY_ERROR_CODES]);
  });

  it('renders every page at the path the thrown message points to', () => {
    for (const page of pages) {
      expect(new URL(getLegacyErrorUrl(page.code)).pathname, page.code).toBe(page.path);
    }
  });

  it('uses paths the site can serve without a redirect', () => {
    for (const page of pages) {
      expect(page.path, page.code).toMatch(new RegExp(`^${ERRORS_BASE_PATH}/[a-z0-9-]+$`));
    }

    expect(new Set(pages.map((page) => page.path)).size).toBe(pages.length);
  });
});
