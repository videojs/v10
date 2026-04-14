/**
 * Mock extending media element — mirrors MuxVideo.
 *
 * Exercises: media element with a host that inherits from another host.
 */
import { CustomMediaElement } from '../../../../core/src/dom/media/custom-media-element';
import { ExtendingHost } from '../../../../core/src/dom/media/extending';

function MediaAttachMixin(base: any) {
  return base;
}

export class ExtendingVideo extends MediaAttachMixin(CustomMediaElement('video', ExtendingHost)) {}
