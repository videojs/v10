import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import {
  buildVimeoIframeSrc,
  VimeoMedia,
  type VimeoPreload,
  vimeoMediaDefaultProps,
} from '@videojs/core/dom/media/vimeo';
import { escapeHtml } from '@videojs/utils/string';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

class VimeoCustomMediaElement extends CustomMediaElement('iframe', VimeoMedia) {
  static override getTemplateHTML = (attrs: Record<string, string>): string => {
    const initialSrc = buildVimeoIframeSrc(attrs.src ?? '', templateAttrsToEmbedProps(attrs));
    const srcAttr = initialSrc ? ` src="${escapeHtml(initialSrc)}"` : '';
    return /*html*/ `
      <style>
        :host {
          display: inline-block;
          min-width: 300px;
          min-height: 150px;
          position: relative;
        }
        iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
        :host(:not([controls])) {
          pointer-events: none;
        }
      </style>
      <iframe part="iframe" allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen frameborder="0" width="100%" height="100%"${srcAttr}></iframe>
    `;
  };
}

function templateAttrsToEmbedProps(attrs: Record<string, string>) {
  return {
    autoplay: attrs.autoplay !== undefined,
    defaultMuted: attrs.muted !== undefined,
    loop: attrs.loop !== undefined,
    controls: attrs.controls !== undefined,
    playsInline: attrs.playsinline !== undefined,
    preload: (attrs.preload as VimeoPreload | undefined) ?? vimeoMediaDefaultProps.preload,
  };
}

/**
 * Web component that embeds a Vimeo video via `@vimeo/player` and exposes an
 * `HTMLMediaElement`-like API. Mirrors the public surface of `media-elements`'
 * `vimeo-video-element`, including support for unlisted videos, live events,
 * picture-in-picture, fullscreen, and arbitrary embed `config` (use this for
 * Vimeo-specific knobs like `autopause`, `byline`, `dnt`).
 */
export class VimeoVideo extends MediaAttachMixin(VimeoCustomMediaElement) {}
