import { isBrandedMedia } from '@videojs/media';

import type { WistiaAdapter } from './adapter';

export const WISTIA_BRAND = '@videojs/wistia-video';

/** Whether `value` is Wistia media: a `WistiaAdapter`, which is Wistia's own player element, or an element built on one. */
export function isWistiaAdapter(value: unknown): value is WistiaAdapter {
  return isBrandedMedia(value, WISTIA_BRAND);
}
