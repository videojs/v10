import { namedNodeMapToObject, serializeAttributes } from '@videojs/utils/dom';
import { omit, pick } from '@videojs/utils/object';
import { kebabCase } from '@videojs/utils/string';
import type { Constructor } from '@videojs/utils/types';

export const AudioAttributes = [
  'disableRemotePlayback',
  'autoplay',
  'controls',
  'controlsList',
  'crossOrigin',
  'loading',
  'loop',
  'muted',
  'playsinline',
  'preload',
  'src',
] as const;

export const VideoAttributes = [
  ...AudioAttributes,
  'autoPictureInPicture',
  'disablePictureInPicture',
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
    static #isDefined = false;

    static get observedAttributes() {
      CustomMedia.#define();
      // biome-ignore lint/complexity/noThisInStatic: intentional use of this
      const Attributes = (this as typeof CustomMedia).Attributes.map((s) => s.toLowerCase());
      return [...Attributes, ...attrToProp.keys()];
    }

    static #define() {
      if (CustomMedia.#isDefined) return;
      CustomMedia.#isDefined = true;

      // First define the getters and setters for the observed attributes.
      // biome-ignore lint/complexity/noThisInStatic: intentional use of this
      const { Attributes } = this as typeof CustomMedia;
      for (const propName of Attributes) {
        // If it's on the MediaHost prototype, handle it below.
        if (propName in MediaHost.prototype) continue;

        const attr = propName.toLowerCase();
        Object.defineProperty(CustomMedia.prototype, propName, {
          get() {
            const val = this.getAttribute(attr);
            return val === null ? false : val === '' ? true : val;
          },
          set(val: string | boolean | number | null) {
            setAttributeValue(this, attr, val);
          },
        });
      }

      // Probe instance to check default value types so only primitive-valued
      // properties are registered as observed attributes.
      const probe = new MediaHost();

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
              const defaultType = typeof probe[prop];
              if (defaultType !== 'object' && defaultType !== 'function') {
                const attr = kebabCase(prop);
                attrToProp.set(attr, prop);

                config.set = function (this: CustomMedia, val: any) {
                  setAttributeValue(this, attr, val);
                };
              } else {
                config.set = function (this: CustomMedia, val: any) {
                  this.#mediaHost[prop] = val;
                };
              }
            }
          }

          Object.defineProperty(CustomMedia.prototype, prop, config);
        }
      }
    }

    #mediaHost: InstanceType<T>;
    #bridgedEventTypes = new Set<string>();
    #childMap = new Map<HTMLTrackElement | HTMLSourceElement, HTMLTrackElement | HTMLSourceElement>();
    #childObserver?: MutationObserver;

    constructor() {
      super();

      if (!this.shadowRoot) {
        const ctor = this.constructor as typeof CustomMedia;
        this.attachShadow(ctor.shadowRootOptions);

        const allowedKeys = ctor.Attributes.map((s) => s.toLowerCase());
        const disallowedKeys = [...attrToProp.keys()];
        const attrs: Record<string, string> = omit(
          pick(namedNodeMapToObject(this.attributes), allowedKeys),
          disallowedKeys
        );
        if (tag && !attrs.part) attrs.part = tag;
        this.shadowRoot!.innerHTML = ctor.getTemplateHTML(attrs);
      }

      this.#mediaHost = new MediaHost();
      this.#mediaHost.attach(this.target);

      this.#childObserver = new MutationObserver(this.#syncMediaChildAttribute.bind(this));
      this.shadowRoot!.addEventListener('slotchange', () => this.#syncMediaChildren());
      this.#syncMediaChildren();
    }

    get target(): HTMLVideoElement | HTMLAudioElement | null {
      return (
        this.querySelector(':scope > [slot=media]') ??
        this.querySelector(tag) ??
        this.shadowRoot?.querySelector(tag) ??
        null
      );
    }

    get defaultMuted() {
      return this.hasAttribute('muted');
    }

    set defaultMuted(val: boolean) {
      setAttributeValue(this, 'muted', val);
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | ((event: never) => void) | null,
      options?: boolean | AddEventListenerOptions
    ) {
      super.addEventListener(type, listener as EventListener, options);
      if (!this.#bridgedEventTypes.has(type)) {
        this.#bridgedEventTypes.add(type);
        this.#mediaHost.addEventListener(type, this.#bridgeEvent);
      }
    }

    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | ((event: never) => void) | null,
      options?: boolean | EventListenerOptions
    ): void {
      super.removeEventListener(type, listener as EventListener, options);
    }

    #bridgeEvent = (event: Event) => {
      if (!event.composed) {
        this.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
      }
    };

    attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
      const prop = attrToProp.get(attrName);
      if (prop) {
        if (oldValue !== newValue) {
          const valueType = typeof this.#mediaHost[prop];
          this.#mediaHost[prop] =
            valueType === 'boolean' ? newValue !== null : valueType === 'number' ? Number(newValue) : (newValue ?? '');
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

    #syncMediaChildren(): void {
      const defaultSlot = this.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement;
      const mediaChildren = new Set(
        defaultSlot
          ?.assignedElements({ flatten: true })
          .filter((el) => el.localName === 'track' || el.localName === 'source') as (
          | HTMLTrackElement
          | HTMLSourceElement
        )[]
      );

      for (const [el, clone] of this.#childMap) {
        if (!mediaChildren.has(el)) {
          clone.remove();
          this.#childMap.delete(el);
        }
      }

      for (const el of mediaChildren) {
        let clone = this.#childMap.get(el);
        if (!clone) {
          clone = el.cloneNode() as HTMLTrackElement | HTMLSourceElement;
          this.#childMap.set(el, clone);
          this.#childObserver?.observe(el, { attributes: true });
        }
        this.target?.append(clone);
        this.#enableDefaultTrack(clone as HTMLTrackElement);
      }
    }

    #syncMediaChildAttribute(mutations: MutationRecord[]): void {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const { target, attributeName } = mutation;
          const clone = this.#childMap.get(target as HTMLTrackElement | HTMLSourceElement);
          if (clone && attributeName) {
            clone.setAttribute(
              attributeName,
              (target as HTMLTrackElement | HTMLSourceElement).getAttribute(attributeName) ?? ''
            );
            this.#enableDefaultTrack(clone as HTMLTrackElement);
          }
        }
      }
    }

    #enableDefaultTrack(trackEl: HTMLTrackElement): void {
      // Browsers don't honor the `default` attribute if a track is added via JS.
      // Enable default tracks for chapters or metadata.
      if (
        trackEl &&
        trackEl.localName === 'track' &&
        trackEl.default &&
        (trackEl.kind === 'chapters' || trackEl.kind === 'metadata') &&
        trackEl.track.mode === 'disabled'
      ) {
        trackEl.track.mode = 'hidden';
      }
    }
  }

  return CustomMedia as any;
}

function setAttributeValue(el: Element, attr: string, val: unknown): void {
  if (val === true || val === false || val == null) {
    el.toggleAttribute(attr, Boolean(val));
  } else {
    el.setAttribute(attr, String(val));
  }
}
