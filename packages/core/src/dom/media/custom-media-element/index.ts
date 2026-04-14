import { namedNodeMapToObject, serializeAttributes } from '@videojs/utils/dom';
import { omit, pick } from '@videojs/utils/object';
import { kebabCase } from '@videojs/utils/string';
import type { Constructor } from '@videojs/utils/types';

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

interface MediaHost extends EventTarget {
  readonly target: EventTarget | null;
  attach(target: EventTarget | null): void;
  detach(): void;
  destroy(): void;
  /** Index signature for dynamic property forwarding. */
  [key: string]: any;
}

type CustomMediaConstructor<T extends Constructor<MediaHost>> = Constructor<HTMLElement & InstanceType<T>> & {
  properties: Record<string, { type: any; attribute?: string }>;
  getTemplateHTML: (attrs: Record<string, string>) => string;
  shadowRootOptions: ShadowRootInit;
  readonly observedAttributes: string[];
};

export function CustomMediaElement<T extends Constructor<MediaHost>>(
  tag: string,
  MediaHost: T
): CustomMediaConstructor<T> {
  const mediaHostAttrToProp = new Map<string, string>();
  let isDefined = false;

  class CustomMedia extends (globalThis.HTMLElement ?? class {}) {
    static getTemplateHTML = tag.endsWith('video') ? getVideoTemplateHTML : getCommonTemplateHTML(tag);
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };
    static properties = {
      autoPictureInPicture: { type: Boolean },
      autoplay: { type: Boolean },
      controls: { type: Boolean },
      controlsList: { type: String },
      crossOrigin: { type: String },
      defaultMuted: { type: Boolean, attribute: 'muted' },
      disablePictureInPicture: { type: Boolean },
      disableRemotePlayback: { type: Boolean },
      loading: { type: String },
      loop: { type: Boolean },
      playsInline: { type: Boolean },
      poster: { type: String },
      preload: { type: String },
      src: { type: String },
    };

    static get observedAttributes() {
      // biome-ignore lint/complexity/noThisInStatic: resolves to the subclass that may override `properties`
      CustomMedia.#define(this);
      return [
        // biome-ignore lint/complexity/noThisInStatic: intentional use of this
        ...getAttrsFromProps(this.properties),
      ];
    }

    static #define(ctor: typeof CustomMedia) {
      if (isDefined) return;
      isDefined = true;

      for (let proto = MediaHost.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
        for (const prop of Object.getOwnPropertyNames(proto)) {
          if (prop in CustomMedia.prototype || excludedProperties.includes(prop)) continue;

          const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
          if (!descriptor) continue;

          const config: PropertyDescriptor = {
            enumerable: true,
            configurable: true,
          };

          if (typeof descriptor.value === 'function') {
            config.value = function (this: CustomMedia, ...args: any[]) {
              return this.#mediaHost[prop](...args);
            };
          } else if (descriptor.get) {
            config.get = function (this: CustomMedia) {
              return this.#mediaHost[prop];
            };

            if (descriptor.set) {
              const attr = kebabCase(prop);
              if (ctor.observedAttributes.includes(attr)) {
                mediaHostAttrToProp.set(attr, prop);

                config.set = function (this: CustomMedia, val: any) {
                  if (val === true || val === false || val == null) {
                    this.toggleAttribute(attr, Boolean(val));
                  } else {
                    this.setAttribute(attr, String(val));
                  }
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

      const properties = ctor.properties as Record<string, { type: any; attribute?: string }>;
      for (const [prop, { type, attribute }] of Object.entries(properties)) {
        if (prop in CustomMedia.prototype) continue;

        const attr = attribute ?? prop.toLowerCase();
        Object.defineProperty(CustomMedia.prototype, prop, {
          get: function (this: CustomMedia) {
            return type === Boolean ? this.hasAttribute(attr) : this.getAttribute(attr);
          },
          set: function (this: CustomMedia, val: any) {
            if (type === Boolean) {
              this.toggleAttribute(attr, Boolean(val));
            } else {
              this.setAttribute(attr, val);
            }
          },
          enumerable: true,
          configurable: true,
        });
      }
    }

    #mediaHost: MediaHost;
    #bridgedEventTypes = new Set<string>();
    #childMap = new Map<HTMLTrackElement | HTMLSourceElement, HTMLTrackElement | HTMLSourceElement>();
    #childObserver?: MutationObserver;

    constructor() {
      super();

      if (!this.shadowRoot) {
        const ctor = this.constructor as typeof CustomMedia;
        this.attachShadow(ctor.shadowRootOptions);

        const allowedKeys = getAttrsFromProps(ctor.properties);
        const disallowedKeys = [...mediaHostAttrToProp.keys()];
        const attrs: Record<string, string> = omit(
          pick(namedNodeMapToObject(this.attributes), allowedKeys),
          disallowedKeys
        );
        if (tag && !attrs.part) attrs.part = tag;
        this.shadowRoot!.innerHTML = ctor.getTemplateHTML(attrs);
      }

      this.#mediaHost = new MediaHost();
      this.#attachToTarget();

      this.#childObserver = new MutationObserver(this.#syncMediaChildAttribute.bind(this));
      this.shadowRoot!.addEventListener('slotchange', () => {
        this.#attachToTarget();
        this.#syncMediaChildren();
      });

      this.#syncMediaChildren();
    }

    #attachToTarget(): void {
      const target = this.target;
      if (target === this.#mediaHost.target) return;
      if (this.#mediaHost.target) this.#mediaHost.detach();
      this.#mediaHost.attach(target);
    }

    get target(): HTMLVideoElement | HTMLAudioElement | null {
      return (
        this.querySelector(':scope > [slot=media]') ??
        this.querySelector(tag) ??
        this.shadowRoot?.querySelector(tag) ??
        null
      );
    }

    disconnectedCallback(): void {
      if (!this.hasAttribute('keep-alive')) {
        this.#mediaHost.destroy();
      }
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
      const prop = mediaHostAttrToProp.get(attrName);
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

function getAttrsFromProps(props: Record<string, any>): string[] {
  return Object.keys(props).map((prop) => props[prop]?.attribute ?? prop.toLowerCase());
}
