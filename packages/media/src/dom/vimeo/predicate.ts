import { isObject } from '@videojs/utils/predicate';
import type { VimeoMedia } from './media';

export const VIMEO_MEDIA = Symbol.for('@videojs/media/vimeo');

/**
 * Check whether a value is a `VimeoMedia`.
 *
 * @param value - Value to identify.
 */
export function isVimeoMedia(value: unknown): value is VimeoMedia {
  return isObject(value) && VIMEO_MEDIA in value;
}
