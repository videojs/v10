import { CustomMediaElement } from '../../../../media/src/dom/custom-media-element';
import { EmbedHost } from '../../../../media/src/dom/embed';

function MediaAttachMixin(base: any) {
  return base;
}

class EmbedCustomMediaElement extends CustomMediaElement({ Adapter: EmbedHost, host: {} }) {}

/**
 * @mediaType video
 * @mediaTarget iframe
 */
export class EmbedVideoElement extends MediaAttachMixin(EmbedCustomMediaElement) {
  static readonly tagName = 'embed-video';
}
