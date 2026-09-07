import { CustomMediaElement } from '../../../../media/src/dom/custom-media-element';
import { EmbedHost } from '../../../../media/src/dom/embed';

function MediaAttachMixin(base: any) {
  return base;
}

class EmbedCustomMediaElement extends CustomMediaElement(EmbedHost) {}

export class EmbedVideo extends MediaAttachMixin(EmbedCustomMediaElement) {}
