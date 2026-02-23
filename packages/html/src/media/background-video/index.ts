import { CustomMediaMixin } from '../custom-media-element';

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
        object-fit: inherit;
      }
    </style>
    <slot></slot>
    <video ${serializeAttributes(attrs)}></video>
  `;
}

export class BackgroundVideo extends CustomMediaMixin(HTMLElement, { tag: 'video' }) {
  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  static getTemplateHTML = getTemplateHTML;

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
  }
}

function namedNodeMapToObject(namedNodeMap: NamedNodeMap) {
  const obj: Record<string, string> = {};
  for (const attr of namedNodeMap) {
    obj[attr.name] = attr.value;
  }
  return obj;
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
