import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { buildVimeoIframeSrc, VimeoMedia } from '@videojs/core/dom/media/vimeo';
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
      <iframe
        part="iframe"
        ${srcAttr}
        allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        frameborder="0"
        width="100%"
        height="100%"
        referrerpolicy="${escapeHtml(attrs.referrerpolicy ?? '')}"
      ></iframe>
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
    preload: (attrs.preload as 'none' | 'metadata' | 'auto' | undefined) ?? 'metadata',
  };
}

export class VimeoVideo extends MediaAttachMixin(VimeoCustomMediaElement) {}
