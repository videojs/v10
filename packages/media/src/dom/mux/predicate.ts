import { isObject } from '@videojs/utils/predicate';
import type { MuxMedia } from './media';

export const MUX_MEDIA = Symbol.for('@videojs/media/mux');

/**
 * Check whether a value is a `MuxMedia`.
 *
 * @param value - Value to identify.
 */
export function isMuxMedia(value: unknown): value is MuxMedia {
  return isObject(value) && MUX_MEDIA in value;
}
