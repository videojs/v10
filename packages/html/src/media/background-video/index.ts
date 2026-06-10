import type { Media } from '@videojs/core/dom';
import { namedNodeMapToObject, serializeAttributes } from '@videojs/utils/dom';
import { pick } from '@videojs/utils/object';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

const VideoAttributes = [
  'autoplay',
  'controls',
  'controlslist',
  'crossorigin',
  'disablepictureinpicture',
  'disableremoteplayback',
  'loop',
  'muted',
  'playsinline',
  'preload',
] as const;

function getTemplateHTML(attrs: Record<string, string>) {
  return /*html*/ `
    <style>
      :host {
        position: relative;
      }

      video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: var(--media-object-fit, inherit);
        object-position: var(--media-object-position, 50% 50%);
      }
    </style>
    <slot></slot>
    <video${serializeAttributes(pick(attrs, [...VideoAttributes]))}></video>
  `;
}

// Don't extend CustomMediaMixin to save some bytes, background videos don't need the full Media API.
export class BackgroundVideo extends MediaAttachMixin(HTMLElement) {
  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  static getTemplateHTML = getTemplateHTML;
  static get observedAttributes() {
    return ['src'];
  }

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof BackgroundVideo).shadowRootOptions);

      const attrs = {
        ...namedNodeMapToObject(this.attributes),
        ...(!this.hasAttribute('nomuted') && { muted: '' }),
        ...(!this.hasAttribute('noloop') && { loop: '' }),
        ...(!this.hasAttribute('noautoplay') && { autoplay: '' }),
        playsinline: '',
        disableremoteplayback: '',
        disablepictureinpicture: '',
      };

      this.shadowRoot!.innerHTML = getTemplateHTML(attrs);
    }

    // Neither Chrome or Firefox support setting the muted attribute
    // after using document.createElement.
    // Get around this by setting the muted property manually.
    this.target!.muted = !this.hasAttribute('nomuted');
  }

  // Register the inner <video> (not `this`) with the provider.
  getMediaTarget(): Media | null {
    return this.target;
  }

  attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
    if (attrName === 'src' && oldValue !== newValue) {
      this.target!.src = newValue ?? '';
    }
  }

  get target(): HTMLVideoElement | null {
    const slotted = this.querySelector(':scope > [slot=media]');
    if (slotted instanceof HTMLVideoElement) return slotted;

    const video = this.querySelector('video') ?? this.shadowRoot?.querySelector('video');
    return video instanceof HTMLVideoElement ? video : null;
  }
}
