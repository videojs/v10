/**
 * Mock extending media element — mirrors MuxVideo.
 *
 * Exercises: media element with a delegate that inherits from another delegate.
 */
import { ExtendingCustomMedia, ExtendingDelegate } from '../../../../core/src/dom/media/extending';

function MediaAttachMixin(base: any) {
  return base;
}
function MediaPropsMixin(base: any, _delegate: any) {
  return base;
}

export class ExtendingVideo extends MediaPropsMixin(MediaAttachMixin(ExtendingCustomMedia), ExtendingDelegate) {}
