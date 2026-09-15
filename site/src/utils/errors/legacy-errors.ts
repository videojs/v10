import { getLegacyErrorRecords, type LegacyErrorRecord } from 'video.js/errors';

import { PRODUCTION_URL } from '@/consts';

export const ERRORS_BASE_PATH = '/errors';

export interface LegacyErrorPage extends LegacyErrorRecord {
  /** Site-relative path the page renders at, e.g. `/errors/legacy-init`. */
  path: string;
}

/**
 * Every `video.js` registry entry paired with the route that renders it.
 *
 * The thrown message ends in `record.url`, so the page must exist at exactly that path. A registry URL that does not
 * resolve to `/errors/<slug>` on the production host fails the build here, rather than shipping a code whose URL 404s.
 */
export function getLegacyErrorPages(): LegacyErrorPage[] {
  return getLegacyErrorRecords().map((record) => {
    const url = new URL(record.url);
    const path = `${ERRORS_BASE_PATH}/${record.slug}`;

    if (url.origin !== PRODUCTION_URL.origin || url.pathname !== path) {
      throw new Error(
        `${record.code} points at ${record.url}, but the site renders it at ${PRODUCTION_URL.origin}${path}. ` +
          'Update the registry URL in packages/video.js or the route in site/src/pages/errors.'
      );
    }

    return { ...record, path };
  });
}
