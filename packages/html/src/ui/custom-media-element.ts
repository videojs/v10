// TODO: This should be adapted to use the MediaApiMixin as a base class.

/**
 * Custom Media Element
 * Based on https://github.com/muxinc/custom-video-element - Mux - MIT License
 *
 * The goal is to create an element that works just like the video element
 * but can be extended/sub-classed, because native elements cannot be
 * extended today across browsers.
 */

// The onevent-like props are weirdly set on the HTMLElement prototype with other
// generic events making it impossible to pick these specific to HTMLMediaElement.
export const Events = [
  'abort',
  'canplay',
  'canplaythrough',
  'durationchange',
  'emptied',
  'encrypted',
  'ended',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeupdate',
  'volumechange',
  'waiting',
  'waitingforkey',
  'resize',
  'enterpictureinpicture',
  'leavepictureinpicture',
  'webkitbeginfullscreen',
  'webkitendfullscreen',
  'webkitpresentationmodechanged',
] as const;

export type EventsMap = {
  [key in (typeof Events)[number]]: CustomEvent;
};

export const Attributes = [
  'autopictureinpicture',
  'disablepictureinpicture',
  'disableremoteplayback',
  'autoplay',
  'controls',
  'controlslist',
  'crossorigin',
  'loop',
  'muted',
  'playsinline',
  'poster',
  'preload',
  'src',
] as const;

/**
 * Helper function to generate the HTML template for audio elements.
 */
function getAudioTemplateHTML(attrs: Record<string, string>): string {
  return /*html*/ `
    <style>
      :host {
        display: inline-flex;
        line-height: 0;
        flex-direction: column;
        justify-content: end;
      }

      audio {
        width: 100%;
      }
    </style>
    <slot name="media">
      <audio${serializeAttributes(attrs)}></audio>
    </slot>
    <slot></slot>
  `;
}

/**
 * Helper function to generate the HTML template for video elements.
 */
function getVideoTemplateHTML(attrs: Record<string, string>): string {
  return /*html*/ `
    <style>
      :host {
        display: inline-block;
        line-height: 0;
      }

      video {
        max-width: 100%;
        max-height: 100%;
        min-width: 100%;
        min-height: 100%;
        object-fit: var(--media-object-fit, contain);
        object-position: var(--media-object-position, 50% 50%);
      }

      video::-webkit-media-text-track-container {
        transform: var(--media-webkit-text-track-transform);
        transition: var(--media-webkit-text-track-transition);
      }
    </style>
    <slot name="media">
      <video${serializeAttributes(attrs)}></video>
    </slot>
    <slot></slot>
  `;
}

type Constructor<T> = {
  new (...args: any[]): T;
};

type MediaChild = HTMLTrackElement | HTMLSourceElement;

declare class CustomAudioElementClass extends HTMLAudioElement implements HTMLAudioElement {
  static readonly observedAttributes: string[];
  static getTemplateHTML: typeof getAudioTemplateHTML;
  static shadowRootOptions: ShadowRootInit;
  static Events: string[];
  readonly nativeEl: HTMLAudioElement;
  attributeChangedCallback(attrName: string, oldValue?: string | null, newValue?: string | null): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
  init(): void;
  handleEvent(event: Event): void;
}

declare class CustomVideoElementClass extends HTMLVideoElement implements HTMLVideoElement {
  static readonly observedAttributes: string[];
  static getTemplateHTML: typeof getVideoTemplateHTML;
  static shadowRootOptions: ShadowRootInit;
  static Events: string[];
  readonly nativeEl: HTMLVideoElement;
  attributeChangedCallback(attrName: string, oldValue?: string | null, newValue?: string | null): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
  init(): void;
  handleEvent(event: Event): void;
}

type CustomMediaElementConstructor<T> = {
  readonly observedAttributes: string[];
  getTemplateHTML: typeof getVideoTemplateHTML | typeof getAudioTemplateHTML;
  shadowRootOptions: ShadowRootInit;
  Events: string[];
  new (...args: any[]): T;
};

export type CustomVideoElement = CustomMediaElementConstructor<CustomVideoElementClass>;
export type CustomAudioElement = CustomMediaElementConstructor<CustomAudioElementClass>;

/**
 * @see https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
 */
export function CustomMediaMixin<T extends Constructor<HTMLElement>>(
  superclass: T,
  { tag, is }: { tag: 'video'; is?: string }
): CustomVideoElement;
export function CustomMediaMixin<T extends Constructor<HTMLElement>>(
  superclass: T,
  { tag, is }: { tag: 'audio'; is?: string }
): CustomAudioElement;
export function CustomMediaMixin<T extends Constructor<HTMLElement>>(
  superclass: T,
  { tag, is }: { tag: 'audio' | 'video'; is?: string }
): any {
  // `is` makes it possible to extend a custom built-in. e.g., castable-video
  const nativeElTest = globalThis.document?.createElement?.(tag, { is } as any);
  const nativeElProps = nativeElTest ? getNativeElProps(nativeElTest) : [];

  return class CustomMedia extends superclass {
    static getTemplateHTML = tag.endsWith('audio') ? getAudioTemplateHTML : getVideoTemplateHTML;
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };
    static Events = Events;
    static #isDefined = false;

    static get observedAttributes() {
      CustomMedia.#define();

      // Include any attributes from the custom built-in.
      // @ts-expect-error
      const natAttrs = nativeElTest?.constructor?.observedAttributes ?? [];

      return [...natAttrs, ...Attributes];
    }

    static #define(): void {
      if (CustomMedia.#isDefined) return;
      CustomMedia.#isDefined = true;

      const propsToAttrs = new Set(CustomMedia.observedAttributes);
      // defaultMuted maps to the muted attribute, handled manually below.
      propsToAttrs.delete('muted');

      // Passthrough native element functions from the custom element to the native element
      for (const prop of nativeElProps) {
        if (prop in CustomMedia.prototype) continue;

        if (typeof nativeElTest[prop] === 'function') {
          // Function
          // @ts-expect-error
          CustomMedia.prototype[prop] = function (...args: any[]) {
            this.#init();

            const fn = () => {
              if (this.call) return this.call(prop, ...args);
              const nativeFn = this.nativeEl?.[prop] as ((...args: any[]) => any) | undefined;
              return nativeFn?.apply(this.nativeEl, args);
            };

            return fn();
          };
        } else {
          // Getter and setter configuration
          const config: PropertyDescriptor = {
            get(this: CustomMedia) {
              this.#init();

              const attr = prop.toLowerCase();
              if (propsToAttrs.has(attr)) {
                const val = this.getAttribute(attr);
                return val === null ? false : val === '' ? true : val;
              }
              return this.get?.(prop) ?? this.nativeEl?.[prop];
            },
          };

          if (prop !== prop.toUpperCase()) {
            config.set = function (this: CustomMedia, val: any) {
              this.#init();

              const attr = prop.toLowerCase();
              if (propsToAttrs.has(attr)) {
                if (val === true || val === false || val == null) {
                  this.toggleAttribute(attr, Boolean(val));
                } else {
                  this.setAttribute(attr, val);
                }
                return;
              }

              if (this.set) {
                this.set(prop, val);
                return;
              }

              if (this.nativeEl) {
                // @ts-expect-error
                this.nativeEl[prop] = val;
              }
            };
          }

          Object.defineProperty(CustomMedia.prototype, prop, config);
        }
      }
    }

    // Private fields
    #isInit = false;
    #nativeEl: HTMLVideoElement | HTMLAudioElement | null = null;
    #childMap = new Map<MediaChild, MediaChild>();
    #childObserver?: MutationObserver;

    get: ((prop: string) => any) | undefined;
    set: ((prop: string, val: any) => void) | undefined;
    call: ((prop: string, ...args: any[]) => any) | undefined;

    // If the custom element is defined before the custom element's HTML is parsed
    // no attributes will be available in the constructor (construction process).
    // Wait until initializing in the attributeChangedCallback or
    // connectedCallback or accessing any properties.

    get nativeEl() {
      this.#init();
      return (
        this.#nativeEl ??
        this.querySelector(':scope > [slot=media]') ??
        this.querySelector(tag) ??
        this.shadowRoot?.querySelector(tag) ??
        null
      );
    }

    set nativeEl(val: HTMLVideoElement | HTMLAudioElement | null) {
      this.#nativeEl = val;
    }

    get defaultMuted() {
      return this.hasAttribute('muted');
    }

    set defaultMuted(val) {
      this.toggleAttribute('muted', val);
    }

    get src() {
      return this.getAttribute('src');
    }

    set src(val) {
      this.setAttribute('src', `${val}`);
    }

    get preload() {
      return this.getAttribute('preload') ?? this.nativeEl?.preload;
    }

    set preload(val) {
      this.setAttribute('preload', `${val}`);
    }

    #init(): void {
      if (this.#isInit) return;
      this.#isInit = true;
      this.init();
    }

    init(): void {
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });

        const attrs = namedNodeMapToObject(this.attributes);
        if (is) attrs.is = is;
        if (tag) attrs.part = tag;
        this.shadowRoot!.innerHTML = (this.constructor as typeof CustomMedia).getTemplateHTML(attrs);
      }

      // Mark as a media element so VJS container discovery can find it via
      // querySelector('[data-media-element]'), complementing 'video, audio'.
      this.setAttribute('data-media-element', '');

      // Neither Chrome or Firefox support setting the muted attribute
      // after using document.createElement.
      // Get around this by setting the muted property manually.
      this.nativeEl!.muted = this.hasAttribute('muted');

      for (const prop of nativeElProps) {
        // @ts-expect-error
        this.#upgradeProperty(prop);
      }

      this.#childObserver = new MutationObserver(this.#syncMediaChildAttribute.bind(this));
      this.shadowRoot!.addEventListener('slotchange', () => this.#syncMediaChildren());
      this.#syncMediaChildren();

      for (const type of (this.constructor as typeof CustomMedia).Events) {
        this.shadowRoot!.addEventListener(type, this, true);
      }
    }

    handleEvent(event: Event): void {
      if (event.target === this.nativeEl) {
        this.dispatchEvent(new CustomEvent(event.type, { detail: (event as CustomEvent).detail }));
      }
    }

    #syncMediaChildren(): void {
      const removeNativeChildren = new Map(this.#childMap);
      const defaultSlot = this.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement;

      const mediaChildren = defaultSlot
        ?.assignedElements({ flatten: true })
        .filter((el) => ['track', 'source'].includes(el.localName)) as MediaChild[];

      mediaChildren.forEach((el) => {
        removeNativeChildren.delete(el);
        let clone = this.#childMap.get(el);
        if (!clone) {
          clone = el.cloneNode() as MediaChild;
          this.#childMap.set(el, clone);
          this.#childObserver?.observe(el, { attributes: true });
        }
        this.nativeEl?.append(clone);
        this.#enableDefaultTrack(clone as HTMLTrackElement);
      });

      removeNativeChildren.forEach((clone, el) => {
        clone.remove();
        this.#childMap.delete(el);
      });
    }

    #syncMediaChildAttribute(mutations: MutationRecord[]): void {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const { target, attributeName } = mutation;
          const clone = this.#childMap.get(target as MediaChild);
          if (clone && attributeName) {
            clone.setAttribute(attributeName, (target as MediaChild).getAttribute(attributeName) ?? '');
            this.#enableDefaultTrack(clone as HTMLTrackElement);
          }
        }
      }
    }

    #enableDefaultTrack(trackEl: HTMLTrackElement): void {
      // Enable default text tracks for chapters or metadata
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

    #upgradeProperty(this: typeof nativeElTest, prop: keyof typeof nativeElTest) {
      // Sets properties that are set before the custom element is upgraded.
      // https://web.dev/custom-elements-best-practices/#make-properties-lazy
      if (Object.hasOwn(this, prop)) {
        const value = this[prop];
        // Delete the set property from this instance.
        delete this[prop];
        // Set the value again via the (prototype) setter on this class.
        // @ts-expect-error
        this[prop] = value;
      }
    }

    attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
      this.#init();
      this.#forwardAttribute(attrName, oldValue, newValue);
    }

    #forwardAttribute(attrName: string, _oldValue: string | null, newValue: string | null): void {
      if (['id', 'class'].includes(attrName)) return;

      if (
        !CustomMedia.observedAttributes.includes(attrName) &&
        (this.constructor as typeof CustomMedia).observedAttributes.includes(attrName)
      ) {
        return;
      }

      if (newValue === null) {
        this.nativeEl?.removeAttribute(attrName);
      } else if (this.nativeEl?.getAttribute(attrName) !== newValue) {
        this.nativeEl?.setAttribute(attrName, newValue);
      }
    }

    connectedCallback(): void {
      this.#init();
    }
  };
}

/**
 * Helper function to get all properties from a native media element's prototype.
 */
function getNativeElProps(nativeElTest: HTMLVideoElement | HTMLAudioElement) {
  const nativeElProps: (keyof typeof nativeElTest)[] = [];
  for (
    let proto = Object.getPrototypeOf(nativeElTest);
    proto && proto !== HTMLElement.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    const props = Object.getOwnPropertyNames(proto) as (keyof typeof nativeElTest)[];
    nativeElProps.push(...props);
  }
  return nativeElProps;
}

/**
 * Helper function to serialize attributes into a string.
 */
function serializeAttributes(attrs: Record<string, string>): string {
  let html = '';
  for (const key in attrs) {
    // Skip forwarding non native video attributes.
    if (!Attributes.includes(key as (typeof Attributes)[number])) continue;

    const value = attrs[key];
    if (value === '') html += ` ${key}`;
    else html += ` ${key}="${value}"`;
  }
  return html;
}

/**
 * Helper function to convert NamedNodeMap to a plain object.
 */
function namedNodeMapToObject(namedNodeMap: NamedNodeMap): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const attr of namedNodeMap) {
    obj[attr.name] = attr.value;
  }
  return obj;
}

export const CustomVideoElement = CustomMediaMixin(globalThis.HTMLElement ?? class {}, {
  tag: 'video',
});

export const CustomAudioElement = CustomMediaMixin(globalThis.HTMLElement ?? class {}, {
  tag: 'audio',
});
