import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import type { TikTokMediaProps } from '@videojs/media/dom/tiktok';
import { buildTikTokIframeSrc, TikTokMedia } from '@videojs/media/dom/tiktok';
import { escapeHtml } from '@videojs/utils/string';

import { MediaAttachMixin } from '../../store/media-attach-mixin';

class TikTokCustomMediaElement extends CustomMediaElement('iframe', TikTokMedia) {
  static override getTemplateHTML = (attrs: Record<string, string>): string => {
    const initialSrc = buildTikTokIframeSrc(attrs.src ?? '', templateAttrsToEmbedProps(attrs));
    const srcAttr = initialSrc ? ` src="${escapeHtml(initialSrc)}"` : '';

    return /*html*/ `
      <style>
        :host {
          display: inline-block;
          /* TikTok videos are portrait, and the player refuses to draw its chrome
             below 325x578, so that is where this host starts rather than the
             300x150 the landscape embeds use. */
          min-width: 325px;
          min-height: 578px;
          position: relative;
        }
        iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
        /* A cross-origin frame swallows every pointer event, so the skin above it
           never sees the hover that reveals the controls. Kept out of hit-testing
           except where the host leaves TikTok's player dormant, which is the same
           pair of cases shouldBootstrapTikTokEmbed opts out of: then the frame's
           own controls are the only thing that can still start it. */
        :host(:not([controls]):not([preload="none"])) {
          pointer-events: none;
        }
      </style>
      <iframe
        part="iframe"
        title="TikTok video player"
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

// Only the props the embed URL is built from. `preload` is not a TikTok parameter, but it decides whether the URL
// carries a bootstrap autoplay, and a URL differing from the host's would have it rebuild the frame on mount.
function templateAttrsToEmbedProps(attrs: Record<string, string>): Partial<TikTokMediaProps> {
  return {
    autoplay: attrs.autoplay !== undefined,
    defaultMuted: attrs.muted !== undefined,
    loop: attrs.loop !== undefined,
    controls: attrs.controls !== undefined,
    preload: attrs.preload as TikTokMediaProps['preload'],
  };
}

export class TikTokVideo extends MediaAttachMixin(TikTokCustomMediaElement) {}
