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
export function getVideoTemplateHTML(attrs: Record<string, string>): string {
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

const excludedProperties = ['target', 'destroy'];

interface MediaHost extends EventTarget {
  target: EventTarget | null;
  destroy(): void;
  /** Index signature for dynamic property forwarding. */
  [key: string]: any;
}

type CustomMediaConstructor<T extends Constructor<MediaHost>> = Constructor<HTMLElement & InstanceType<T>> & {
  properties: Record<string, { type: any; attribute?: string; empty?: unknown }>;
  getTemplateHTML: (attrs: Record<string, string>) => string;
  shadowRootOptions: ShadowRootInit;
  readonly observedAttributes: string[];
};

/** Apply a property value that may have been set before custom element upgrade. */
export function upgradeProperty(element: HTMLElement, prop: string): void {
  const self = element as unknown as Record<string, unknown>;
  // biome-ignore lint/suspicious/noPrototypeBuiltins: see comment above
  if (!Object.prototype.hasOwnProperty.call(self, prop)) return;
  const value = self[prop];
  delete self[prop];
  self[prop] = value;
}

export function CustomMediaElement<T extends Constructor<MediaHost>>(
  tag: string,
  MediaHost: T
): CustomMediaConstructor<T> {
  const syncTargetAttributes = tag !== 'iframe';
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
      poster: { type: String, empty: '' },
      preload: { type: String, empty: null },
      src: { type: String, empty: '' },
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

      const properties = ctor.properties as Record<string, { type: any; attribute?: string; empty?: unknown }>;

      for (let proto = MediaHost.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
        for (const prop of Object.getOwnPropertyNames(proto)) {
          if (prop in CustomMedia.prototype || excludedProperties.includes(prop)) continue;
          // Defer to the explicit `ctor.properties` loop when its attribute
          // mapping diverges from `kebabCase(prop)`. Covers multi-word camelCase
          // props (`playsInline` → `'playsinline'`) and explicit overrides
          // (`defaultMuted` → `attribute: 'muted'`). Single-word props in
          // `properties` (like `loop`, `preload`) keep their legacy proto-walk
          // path so the mediaHost still receives the setter call.
          const propConfig = properties[prop];
          if (propConfig && (propConfig.attribute ?? prop.toLowerCase()) !== kebabCase(prop)) continue;

          const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
          if (!descriptor) continue;

          const config: PropertyDescriptor = {
            enumerable: true,
            configurable: true,
          };

          if (typeof descriptor.value === 'function') {
            config.value = function (this: CustomMedia, ...args: any[]) {
              return this.#mediaHost?.[prop](...args);
            };
          } else if (descriptor.get) {
            config.get = function (this: CustomMedia) {
              return this.#mediaHost?.[prop];
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
                  if (this.#mediaHost) this.#mediaHost[prop] = val;
                };
              }
            }
          }

          Object.defineProperty(CustomMedia.prototype, prop, config);
        }
      }

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

    #mediaHost: MediaHost | null = null;
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
        const pickedAttrs = pick(namedNodeMapToObject(this.attributes), allowedKeys);
        // Embed templates (iframe) need host-bound attrs (e.g. `src`) to build the initial URL.
        const attrs: Record<string, string> = tag === 'iframe' ? pickedAttrs : omit(pickedAttrs, disallowedKeys);
        if (tag && !attrs.part) attrs.part = tag;
        this.shadowRoot!.innerHTML = ctor.getTemplateHTML(attrs);
      }

      this.#createMediaHost();
      if (tag === 'iframe') this.#syncMediaHostFromAttributes();
      this.#attachToTarget();

      this.#childObserver = new MutationObserver(this.#syncMediaChildAttribute.bind(this));
      this.shadowRoot!.addEventListener('slotchange', () => {
        this.#attachToTarget();
        this.#syncMediaChildren();
      });

      this.#syncMediaChildren();
    }

    connectedCallback(): void {
      this.#createMediaHost();
      this.#hydrateIframeConfig();
      if (tag === 'iframe') this.#syncMediaHostFromAttributes();
      this.#attachToTarget();
      this.#syncMediaChildren();
    }

    #createMediaHost(): void {
      if (this.#mediaHost) return;
      this.#mediaHost = new MediaHost();
      for (const type of this.#bridgedEventTypes) {
        this.#mediaHost.addEventListener(type, this.#bridgeEvent);
      }
    }

    #attachToTarget(): void {
      const target = this.target;
      if (!this.#mediaHost || target === this.#mediaHost.target) return;
      this.#mediaHost.target = target;
    }

    get target(): HTMLElement | null {
      return (
        this.querySelector(':scope > [slot=media]') ??
        this.querySelector(tag) ??
        this.shadowRoot?.querySelector(tag) ??
        null
      );
    }

    disconnectedCallback(): void {
      if (!this.hasAttribute('keep-alive') && this.#mediaHost) {
        for (const type of this.#bridgedEventTypes) {
          this.#mediaHost.removeEventListener(type, this.#bridgeEvent);
        }
        this.#mediaHost.destroy();
        this.#mediaHost = null;
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
        this.#createMediaHost();
        this.#mediaHost!.addEventListener(type, this.#bridgeEvent);
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
        if (!this.#mediaHost) return;
        if (oldValue !== newValue) {
          this.#syncMediaHostAttribute(attrName);
        }
        return;
      }

      if (
        !CustomMedia.observedAttributes.includes(attrName) &&
        (this.constructor as typeof CustomMedia).observedAttributes.includes(attrName)
      ) {
        return;
      }

      if (!syncTargetAttributes) return;

      if (newValue === null) {
        this.target?.removeAttribute(attrName);
      } else if (this.target?.getAttribute(attrName) !== newValue) {
        this.target?.setAttribute(attrName, newValue);
      }
    }

    #hydrateIframeConfig(): void {
      if (tag !== 'iframe' || !this.#mediaHost) return;
      const iframe = this.target as HTMLIFrameElement | null;
      if (!iframe?.dataset.config) return;

      const hostConfig = this.#mediaHost.config;
      if (hostConfig && typeof hostConfig === 'object' && Object.keys(hostConfig).length > 0) return;
      try {
        this.#mediaHost.config = JSON.parse(iframe.dataset.config);
      } catch {
        // ignore — invalid JSON.
      }
    }

    #syncMediaHostFromAttributes(): void {
      const ctor = this.constructor as typeof CustomMedia;
      for (const attrName of ctor.observedAttributes) {
        this.#syncMediaHostAttribute(attrName);
      }
    }

    #syncMediaHostAttribute(attrName: string): void {
      if (!this.#mediaHost) return;

      const prop = mediaHostAttrToProp.get(attrName);
      if (!prop) return;

      const newValue = this.getAttribute(attrName);
      const valueType = typeof this.#mediaHost[prop];
      const propConfig = (this.constructor as CustomMediaConstructor<T>).properties[prop];
      const emptyValue = propConfig && 'empty' in propConfig ? propConfig.empty : '';

      this.#mediaHost[prop] =
        valueType === 'boolean'
          ? newValue !== null
          : valueType === 'number'
            ? Number(newValue)
            : (newValue ?? emptyValue);
    }

    #syncMediaChildren(): void {
      if (tag === 'iframe') return;

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
