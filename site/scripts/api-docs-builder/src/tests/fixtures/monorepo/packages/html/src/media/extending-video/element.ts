/**
 * Mock extending media element — mirrors MuxVideo.
 *
 * Exercises: media element with a host that inherits from another host,
 * plus a hoisted-const base with an `as` cast in the extends clause.
 */
import { CustomMediaElement } from '../../../../media/src/dom/custom-media-element';
import { ExtendingHost } from '../../../../media/src/dom/extending';

function MediaAttachMixin(base: any) {
  return base;
}

const ExtendingVideoBase = MediaAttachMixin(CustomMediaElement({ Adapter: ExtendingHost, host: {} }));

/**
 * @mediaType video
 * @mediaTarget video
 */
export class ExtendingVideoElement extends (ExtendingVideoBase as typeof ExtendingVideoBase) {
  static readonly tagName = 'extending-video';
}
