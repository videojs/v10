import { namedNodeMapToObject, serializeAttributes } from '@videojs/utils/dom';
import { kebabCase } from '@videojs/utils/string';
import type { Constructor } from '@videojs/utils/types';

export const AudioAttributes = [
  'disableremoteplayback',
  'autoplay',
  'controls',
  'controlslist',
  'crossorigin',
  'loading',
  'loop',
  'muted',
  'playsinline',
  'preload',
  'src',
] as const;

export const VideoAttributes = [
  ...AudioAttributes,
  'autopictureinpicture',
  'disablepictureinpicture',
  'poster',
] as const;

/** CSS custom property names for video elements. */
export const VideoCSSVars = {
  /** Border radius of the video element. */
  borderRadius: '--media-video-border-radius',
  /** Object fit for the video. */
  objectFit: '--media-object-fit',
  /** Object position for the video. */
  objectPosition: '--media-object-position',
  /** Duration of the caption track transition. */
  captionTrackDuration: '--media-caption-track-duration',
  /** Delay before the caption track transition. */
  captionTrackDelay: '--media-caption-track-delay',
  /** Vertical offset of the caption track. */
  captionTrackY: '--media-caption-track-y',
} as const;

/** CSS custom property names for audio elements. */
export const AudioCSSVars = {} as const;

/** Helper function to generate the HTML template for video elements. */
function getVideoTemplateHTML(attrs: Record<string, string>): string {
  return /*html*/ `
    <style>
      :host {
        display: contents;
      }

      video {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: var(${VideoCSSVars.borderRadius});
        object-fit: var(${VideoCSSVars.objectFit}, contain);
        object-position: var(${VideoCSSVars.objectPosition}, center);
      }

      video::-webkit-media-text-track-container {
        transition: translate var(${VideoCSSVars.captionTrackDuration}, 0) ease-out;
        transition-delay: var(${VideoCSSVars.captionTrackDelay}, 0);
        translate: 0 var(${VideoCSSVars.captionTrackY}, 0);
        scale: 0.98;
        z-index: 1;
        font-family: inherit;
      }
    </style>
    <slot name="media">
      <video${serializeAttributes(attrs)}></video>
    </slot>
    <slot></slot>
  `;
}

/** Helper function to generate the HTML template for other elements. */
function getCommonTemplateHTML(tag: string) {
  return (attrs: Record<string, string>) => {
    return /*html*/ `
      <style>
        :host {
          display: inline-flex;
          line-height: 0;
          flex-direction: column;
          justify-content: end;
        }

        ${tag} {
          width: 100%;
        }
      </style>
      <slot name="media">
        <${tag}${serializeAttributes(attrs)}></${tag}>
      </slot>
      <slot></slot>
    `;
  };
}

/** Properties that are excluded from the custom media element. */
const excludedProperties = ['attach', 'detach', 'destroy'];

export function CustomMediaElement<T extends Constructor<any>>(
  tag: string,
  MediaHost: T
): Constructor<HTMLElement & InstanceType<T>> & {
  readonly Attributes: readonly string[];
  getTemplateHTML: (attrs: Record<string, string>) => string;
  shadowRootOptions: ShadowRootInit;
  readonly observedAttributes: string[];
} {
  const attrToProp = new Map<string, string>();

  class CustomMedia extends (globalThis.HTMLElement ?? class {}) {
    static Attributes = tag.endsWith('video') ? VideoAttributes : tag.endsWith('audio') ? AudioAttributes : [];
    static getTemplateHTML = tag.endsWith('video') ? getVideoTemplateHTML : getCommonTemplateHTML(tag);
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };

    static get observedAttributes() {
      CustomMedia.#define();
      // biome-ignore lint/complexity/noThisInStatic: intentional use of this
      const { Attributes } = this as typeof CustomMedia;
      return [...new Set([...Attributes, ...attrToProp.keys()])];
    }

    static #define() {
      for (let proto = MediaHost.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
        for (const prop of Object.getOwnPropertyNames(proto)) {
          if (prop in CustomMedia.prototype || excludedProperties.includes(prop)) continue;

          const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
          if (!descriptor) continue;

          const config: PropertyDescriptor = {};
          if (typeof descriptor.value === 'function') {
            config.value = function (this: CustomMedia, ...args: any[]) {
              return this.#mediaHost[prop](...args);
            };
          } else if (descriptor.get) {
            config.get = function (this: CustomMedia) {
              return this.#mediaHost[prop];
            };

            if (descriptor.set) {
              attrToProp.set(kebabCase(prop), prop);
              config.set = function (this: CustomMedia, val: any) {
                this.#mediaHost[prop] = val;
              };
            }
          }

          Object.defineProperty(CustomMedia.prototype, prop, config);
        }
      }
    }

    #mediaHost: InstanceType<T>;

    constructor() {
      super();

      if (!this.shadowRoot) {
        this.attachShadow((this.constructor as typeof CustomMedia).shadowRootOptions);

        const attrs = namedNodeMapToObject(this.attributes);
        if (tag && !attrs.part) attrs.part = tag;
        this.shadowRoot!.innerHTML = (this.constructor as typeof CustomMedia).getTemplateHTML(attrs);
      }

      this.#mediaHost = new MediaHost();
      this.#mediaHost.attach(this.target);
    }

    get target() {
      return (
        this.querySelector(':scope > [slot=media]') ??
        this.querySelector(tag) ??
        this.shadowRoot?.querySelector(tag) ??
        null
      );
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | ((event: never) => void) | null,
      options?: boolean | AddEventListenerOptions
    ) {
      this.#mediaHost.addEventListener(type, listener, options);
    }

    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | ((event: never) => void) | null,
      options?: boolean | EventListenerOptions
    ): void {
      this.#mediaHost.removeEventListener(type, listener, options);
    }

    attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
      const prop = attrToProp.get(attrName);
      if (prop) {
        if (oldValue !== newValue) {
          (this as any)[prop] = typeof (this as any)[prop] === 'boolean' ? newValue !== null : (newValue ?? '');
        }
        return;
      }

      if (
        !CustomMedia.observedAttributes.includes(attrName) &&
        (this.constructor as typeof CustomMedia).observedAttributes.includes(attrName)
      ) {
        return;
      }

      if (newValue === null) {
        this.target?.removeAttribute(attrName);
      } else if (this.target?.getAttribute(attrName) !== newValue) {
        this.target?.setAttribute(attrName, newValue);
      }
    }

    disconnectedCallback(): void {
      if (!this.hasAttribute('keep-alive')) {
        this.#mediaHost.destroy();
      }
    }
  }

  return CustomMedia as any;
}
