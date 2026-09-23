import { getLegacyErrorRecords, type LegacyErrorRecord } from 'video.js/errors';

import { PRODUCTION_URL } from '@/consts';

export const LEGACY_ERROR_REFERENCE_PATH = '/docs/reference/api';

export interface LegacyErrorPage extends LegacyErrorRecord {
  /** Framework-neutral docs path, e.g. `/docs/reference/api/v8-legacy-init`. */
  path: string;
}

/**
 * Every `video.js` registry entry paired with the route that renders it.
 *
 * The thrown message ends in `record.url`, so the framework-neutral docs route must resolve to its reference page. A
 * registry URL that differs from the reference path fails the build.
 */
export function getLegacyErrorPages(): LegacyErrorPage[] {
  return getLegacyErrorRecords().map((record) => {
    const url = new URL(record.url);
    const path = `${LEGACY_ERROR_REFERENCE_PATH}/${record.slug}`;

    if (url.origin !== PRODUCTION_URL.origin || url.pathname !== path) {
      throw new Error(
        `${record.code} points at ${record.url}, but the site renders it at ${PRODUCTION_URL.origin}${path}. ` +
          'Update the registry URL in packages/video.js or the reference page path.'
      );
    }

    return { ...record, path };
  });
}
