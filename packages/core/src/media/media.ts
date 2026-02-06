type Constructor<T> = new (...args: any[]) => T;

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
export const MediaMixin = <T extends EventTarget>(superclass: Constructor<T>) => {
  class Media extends (superclass as Constructor<any>) {
    static #proxyProps(element: HTMLMediaElement) {
      const nativeElProps = getNativeElProps(element);

      // Passthrough native element functions from the custom element to the native element
      for (const prop of nativeElProps) {
        if (prop in Media.prototype) continue;

        if (typeof element?.[prop] === 'function') {
          Media.prototype[prop] = function (...args: any[]) {
            return this.call(prop, ...args);
          };
        } else {
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
    }

    #element: HTMLMediaElement | null = null;

    get element() {
      return this.#element;
    }

    get(prop: keyof HTMLMediaElement): any {
      return this.element?.[prop];
    }

    set(prop: keyof HTMLMediaElement, val: any): void {
      if (this.element) {
        // @ts-expect-error - Errors on readonly property
        this.element[prop] = val;
      }
    }

    call(prop: keyof HTMLMediaElement, ...args: any[]): any {
      const nativeFn = this.element?.[prop] as ((...args: any[]) => any) | undefined;
      return nativeFn?.apply(this.element, args);
    }

    attach(element: HTMLMediaElement): void {
      if (!element || this.#element === element) return;
      this.#element = element;
      // Proxy native element methods and properties to the media instance.
      Media.#proxyProps(element);
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
  return Media as Constructor<T & InstanceType<typeof Media>>;
};

export class Media extends MediaMixin(EventTarget) {}
export class Video extends MediaMixin(EventTarget) {}
export class Audio extends MediaMixin(EventTarget) {}

/**
 * Helper function to get all properties from a native media element's prototype.
 * TODO: For React native don't use HTMLElement?
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
