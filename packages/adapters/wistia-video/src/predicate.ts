import { isBrandedMedia } from '@videojs/media';

import type { WistiaAdapter } from './adapter';

export const WISTIA_MEDIA = '@videojs/wistia-video';

/** Whether `value` is Wistia media: a `WistiaAdapter`, which is Wistia's own player element, or an element built on one. */
export function isWistiaMedia(value: unknown): value is WistiaAdapter {
  return isBrandedMedia(value, WISTIA_MEDIA);
}
