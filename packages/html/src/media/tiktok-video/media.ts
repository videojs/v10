import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
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
        /* Deliberately no pointer-events opt-out, unlike the sibling embed hosts.
           Hiding TikTok's chrome already leaves the frame with nothing to click,
           and the embed will not start from a play command alone unless the frame
           has its own user activation — so taking pointer events away removes the
           only thing that can start it. Upstream's element leaves the frame
           interactive for the same reason. */
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

// Only the props the embed URL is built from: TikTok reads nothing else out of it.
function templateAttrsToEmbedProps(attrs: Record<string, string>) {
  return {
    autoplay: attrs.autoplay !== undefined,
    defaultMuted: attrs.muted !== undefined,
    loop: attrs.loop !== undefined,
    controls: attrs.controls !== undefined,
  };
}

export class TikTokVideo extends MediaAttachMixin(TikTokCustomMediaElement) {}
