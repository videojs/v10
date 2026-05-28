import { CustomMediaElement, upgradeProperty } from '@videojs/core/dom/media/custom-media-element';
import { getVimeoIframeTemplateHTML, VimeoMedia } from '@videojs/core/dom/media/vimeo';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

class VimeoCustomMediaElement extends CustomMediaElement('iframe', VimeoMedia) {
  static override getTemplateHTML = getVimeoIframeTemplateHTML;

  constructor() {
    super();
    upgradeProperty(this, 'config');
  }
}

/**
 * Web component that embeds a Vimeo video via `@vimeo/player` and exposes an
 * `HTMLMediaElement`-like API. Mirrors the public surface of `media-elements`'
 * `vimeo-video-element`, including support for unlisted videos, live events,
 * picture-in-picture, fullscreen, and arbitrary embed `config` (use this for
 * Vimeo-specific knobs like `autopause`, `byline`, `dnt`).
 */
export class VimeoVideo extends MediaAttachMixin(VimeoCustomMediaElement) {}
