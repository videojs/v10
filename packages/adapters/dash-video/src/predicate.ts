import { isBrandedMedia } from '@videojs/media';

import type { DashAdapter } from './adapter';

export const DASH_BRAND = '@videojs/dash-video';

/**
 * Whether `value` is dash.js media: a `DashAdapter`, or a media element built on one. Narrows `engine` to the dash.js
 * player.
 */
export function isDashAdapter(value: unknown): value is DashAdapter {
  return isBrandedMedia(value, DASH_BRAND);
}
