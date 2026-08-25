// @vitest-environment node
// Sätteri's native binding builds typed-array buffers that fail against jsdom's
// patched ArrayBuffer/DataView globals; run these against the real node realm.
import { isNumber } from '@videojs/utils/predicate';
import { markdownToHtml } from 'satteri';
import { describe, expect, it } from 'vite-plus/test';

import { satteriReadingTime } from '../satteriReadingTime';

function render(source: string) {
  const frontmatter: Record<string, import('../site-data-value').SiteDataValue> = {};
  const data = {
    astro: {
      frontmatter,
      headings: [],
      localImagePaths: new Set<string>(),
      remoteImagePaths: new Set<string>(),
    },
  };
  markdownToHtml(source, { mdastPlugins: [satteriReadingTime()], data });
  return data.astro.frontmatter;
}

describe('satteriReadingTime', () => {
  it('injects reading time into the frontmatter bag', () => {
    const words = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ');
    const frontmatter = render(`# Title\n\n${words}`);

    expect(frontmatter.minutesRead).toMatch(/min read/);
    expect(isNumber(frontmatter.readingTimeMinutes)).toBe(true);
    expect(
      /* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ frontmatter.readingTimeMinutes as number
    ).toBeGreaterThan(0);
  });

  it('counts code and inline code toward the total', () => {
    const withCode = render('# Title\n\nSome `inline` text\n\n```ts\nconst a = 1;\n```');
    expect(withCode.minutesRead).toMatch(/min read/);
  });
});
