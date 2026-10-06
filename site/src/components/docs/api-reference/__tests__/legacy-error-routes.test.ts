import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { getLegacyErrorRecords } from 'video.js/errors';
import { describe, expect, it } from 'vite-plus/test';

describe('legacy error reference routes', () => {
  it('has a reference page at every URL emitted by the package', () => {
    for (const record of getLegacyErrorRecords()) {
      expect(record.url, record.code).toBe(`https://videojs.org/docs/reference/api/${record.slug}`);
      expect(existsSync(resolve('src/content/docs/reference/api', `${record.slug}.mdx`)), record.code).toBe(true);
    }
  });
});
