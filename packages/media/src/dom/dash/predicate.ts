import { isObject } from '@videojs/utils/predicate';
import type { DashMedia } from './media';

export const DASH_MEDIA = Symbol.for('@videojs/media/dash');

/**
 * Check whether a value is a `DashMedia`.
 *
 * @param value - Value to identify.
 */
export function isDashMedia(value: unknown): value is DashMedia {
  return isObject(value) && DASH_MEDIA in value;
}
