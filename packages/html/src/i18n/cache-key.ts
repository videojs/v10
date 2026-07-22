import type { Text, TextParams } from '@videojs/core/i18n';

/** Serialize text content and parameters so dynamic labels invalidate their caches. */
export function cacheKey(text: Text | string, params?: TextParams): string {
  return JSON.stringify([text, params]);
}
