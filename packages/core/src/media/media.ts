type Constructor<T> = {
  new (...args: any[]): T;
  prototype: T;
};

export type MediaElementConstructor =
  | Constructor<HTMLMediaElement>
  | Constructor<HTMLVideoElement>
  | Constructor<HTMLAudioElement>;

export type MediaElementInstance = InstanceType<MediaElementConstructor>;

/**
 * This class provides a base for a uniform Media API across all media types.
 *
 * Many methods and properties will need no translation and are proxied directly to the attached element.
 * For example, the `play` and `pause` methods are proxied directly to the attached element.
 *
 * Child classes can override the proxied methods and properties to provide custom behavior.
 * For example, the `src` property for HLS media is proxied to the HLS engine, not the element itself.
 *
 * The `get`, `set`, and `call` methods can be overridden to provide catch-all custom behavior.
 */
export const MediaMixin = <T extends EventTarget, E extends MediaElementConstructor>(
  Super: Constructor<T>,
  MediaElement: E
) => {
  class Media extends (Super as Constructor<EventTarget>) {
    static define(MediaElement: E) {
      const { props, methods } = getNativeElProps(MediaElement);

      // Passthrough native element functions from the custom element to the native element
      for (const method of methods) {
        if (method in Media.prototype) continue;

        (Media.prototype as any)[method] = function (...args: any[]) {
          return this.call(method, ...args);
        };
      }

      for (const prop of props) {
        if (prop in Media.prototype) continue;

        const config: PropertyDescriptor = {
          get(this: Media) {
            return this.get(prop);
          },
        };

        if (prop !== prop.toUpperCase()) {
          config.set = function (this: Media, val: any) {
            this.set(prop, val);
          };
        }

        Object.defineProperty(Media.prototype, prop, config);
      }
    }

    #element: MediaElementInstance | null = null;

    get element() {
      return this.#element;
    }

    get(prop: keyof MediaElementInstance): any {
      return this.element?.[prop];
    }

    set(prop: keyof MediaElementInstance, val: any): void {
      if (this.element) {
        // @ts-expect-error - Errors on readonly property
        this.element[prop] = val;
      }
    }

    call(prop: keyof MediaElementInstance, ...args: any[]): any {
      const nativeFn = this.element?.[prop] as ((...args: any[]) => any) | undefined;
      return nativeFn?.apply(this.element, args);
    }

    attach(element: MediaElementInstance): void {
      if (!element || this.#element === element) return;
      this.#element = element;
    }

    detach(): void {
      if (!this.#element) return;
      this.#element = null;
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void {
      this.#element?.addEventListener(type, listener, options);
    }

    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void {
      this.#element?.removeEventListener(type, listener, options);
    }

    dispatchEvent(event: Event): boolean {
      return this.#element?.dispatchEvent(event) ?? false;
    }
  }

  // Proxy native element methods and properties to the media instance.
  Media.define(MediaElement);

  return Media as Constructor<T & E> & typeof Media;
};

// TODO: For React native don't use HTMLMediaElement or child classes.
export class Media extends MediaMixin(EventTarget, HTMLMediaElement) {}
export class Video extends MediaMixin(EventTarget, HTMLVideoElement) {}
export class Audio extends MediaMixin(EventTarget, HTMLAudioElement) {}

/**
 * Helper function to get all properties from a native media element's prototype.
 * TODO: For React native don't use HTMLElement.
 */
function getNativeElProps(MediaElement: MediaElementConstructor) {
  const methods: Set<keyof MediaElementInstance> = new Set();
  const props: Set<keyof MediaElementInstance> = new Set();

  for (
    let proto = MediaElement.prototype;
    proto && proto !== HTMLElement.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    const names = Object.getOwnPropertyNames(proto);
    names.forEach((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      if (descriptor?.value && typeof descriptor.value === 'function') {
        methods.add(name as keyof MediaElementInstance);
      } else {
        props.add(name as keyof MediaElementInstance);
      }
    });
  }

  return { props, methods };
}
