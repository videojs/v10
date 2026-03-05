import { namedNodeMapToObject } from '@videojs/utils/dom';

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
    <video ${serializeAttributes(attrs)}></video>
  `;
}

// Don't extend CustomMediaMixin to save some bytes, background videos don't need the full Media API.
export class BackgroundVideo extends HTMLElement {
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

  attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
    if (attrName === 'src' && oldValue !== newValue) {
      this.target!.src = newValue ?? '';
    }
  }

  get target(): HTMLVideoElement | null {
    return (
      this.querySelector(':scope > [slot=media]') ??
      this.querySelector('video') ??
      this.shadowRoot?.querySelector('video') ??
      null
    );
  }
}

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

function serializeAttributes(attrs: Record<string, string>): string {
  let html = '';
  for (const key in attrs) {
    // Skip forwarding non native video attributes.
    if (!VideoAttributes.includes(key as any)) continue;

    const value = attrs[key];
    if (value === '') html += ` ${key}`;
    else html += ` ${key}="${value}"`;
  }
  return html;
}
