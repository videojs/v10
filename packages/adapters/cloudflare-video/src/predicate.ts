import { isBrandedMedia } from '@videojs/media';

import type { CloudflareAdapter } from './adapter';

export const CLOUDFLARE_MEDIA = '@videojs/cloudflare-video';

/**
 * Whether `value` is Cloudflare Stream media: a `CloudflareAdapter`, or a media element built on one. Narrows `engine`
 * to the Stream player.
 */
export function isCloudflareMedia(value: unknown): value is CloudflareAdapter {
  return isBrandedMedia(value, CLOUDFLARE_MEDIA);
}
