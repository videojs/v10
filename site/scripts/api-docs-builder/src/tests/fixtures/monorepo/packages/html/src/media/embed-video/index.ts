import { CustomMediaElement } from '../../../../core/src/dom/media/custom-media-element';
import { EmbedHost } from '../../../../core/src/dom/media/embed';

function MediaAttachMixin(base: any) {
  return base;
}

class EmbedCustomMediaElement extends CustomMediaElement('iframe', EmbedHost) {}

export class EmbedVideo extends MediaAttachMixin(EmbedCustomMediaElement) {}
