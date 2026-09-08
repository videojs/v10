import type { Constructor } from '@videojs/utils/types';

import { audioContentAttributes } from '../html-audio-adapter';
import { type AdapterHost, type AttributeConfigs } from '../html-media-adapter';
import { videoContentAttributes } from '../html-video-adapter';
import { AdapterAttachment } from './attach-adapter';
import { attributeName, buildRoutes, coerceAttribute, derivedAttributes } from './attributes';
import { bridgeEvent, forwardAdapter, reflectAttributes, unbridgeEvents } from './element-surface';
import { MediaChildren } from './media-children';
import { initialAttributes, renderHost } from './render-host';
import { defaultTemplate, type MediaTemplate } from './templates';

export interface PlaybackAdapter extends EventTarget {
  attach(target: EventTarget | null): void;
  detach(): void;
  destroy(): void;
  /** Index signature for dynamic property forwarding (includes the adapter's protected `target`). */
  [key: string]: any;
}

/**
 * An adapter class as an element sees it: constructible without arguments, naming the element it drives, and declaring
 * its configurable properties with their defaults.
 */
export interface PlaybackAdapterConstructor<T extends PlaybackAdapter = PlaybackAdapter> extends Constructor<T> {
  readonly host: AdapterHost;
  readonly defaultProps: object;
}

export interface CustomMediaElementOptions {
  /** Shadow template, given the element's initial attributes. Defaults to the bare host element in a `media` slot. */
  template?: MediaTemplate;
}

type CustomMediaConstructor<T extends PlaybackAdapterConstructor> = Constructor<
  HTMLElement &
    InstanceType<T> & {
      readonly adapter: InstanceType<T>;
      attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    }
> & {
  template: MediaTemplate;
  shadowRootOptions: ShadowRootInit;
  readonly observedAttributes: string[];
};

/** The content attributes each native host accepts and passes through to its element. An iframe passes nothing. */
const nativeAttributes: Record<AdapterHost, AttributeConfigs> = {
  video: videoContentAttributes,
  audio: audioContentAttributes,
  iframe: {},
};

/**
 * Build a custom element around an adapter.
 *
 * The element renders the adapter's `host` in its shadow root, attaches the adapter to it, and is the adapter to its
 * callers: every method, accessor, and event comes through. Its content attributes are the host's native ones plus one
 * for each primitive in the adapter's `defaultProps`; an attribute the adapter owns writes the adapter, and any other
 * native attribute is copied onto the inner element. `<track>` and `<source>` children reach a native host too.
 *
 * @param Adapter - Adapter class with static `host` and `defaultProps`.
 * @param options - The shadow template, for elements that render more than the bare host.
 */
export function CustomMediaElement<T extends PlaybackAdapterConstructor>(
  Adapter: T,
  options: CustomMediaElementOptions = {}
): CustomMediaConstructor<T> {
  const tag = Adapter.host;
  const native = nativeAttributes[tag];
  const passthrough = tag !== 'iframe';
  const nativeNames = new Set(Object.entries(native).map(([prop, config]) => attributeName(prop, config)));
  const routes = buildRoutes(native, derivedAttributes(Adapter.defaultProps), Adapter);

  class CustomMedia extends (globalThis.HTMLElement ?? class {}) {
    static template = options.template ?? defaultTemplate(tag);
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };

    static get observedAttributes(): string[] {
      return [...routes.observed];
    }

    #adapter = new Adapter();
    #children = passthrough ? new MediaChildren(this, () => this.target) : null;
    #attachment = new AdapterAttachment(
      this,
      this.#adapter,
      () => this.target,
      () => {
        unbridgeEvents(this);
        this.#children?.disconnect();
      }
    );

    constructor() {
      super();

      renderHost(this, { part: tag, ...initialAttributes(this, routes, { passthrough }) });

      this.#attachment.attach();
      this.shadowRoot!.addEventListener('slotchange', () => {
        // A target that arrives later has seen none of the attributes already on the element.
        if (this.#attachment.attach()) this.#hydrate();

        this.#children?.sync();
      });

      this.#children?.sync();
    }

    get adapter(): PlaybackAdapter {
      return this.#adapter;
    }

    /**
     * The element the adapter plays through: a child of the host's tag slotted as `media`, else a child of the host's
     * tag, else the one rendered in the shadow root. Only direct children of the right tag count, so a `<video>` nested
     * in slotted content, or a `<div slot="media">`, is not adopted.
     */
    get target(): HTMLElement | null {
      return (
        this.querySelector(`:scope > ${tag}[slot=media]`) ??
        this.querySelector(`:scope > ${tag}`) ??
        this.shadowRoot?.querySelector(tag) ??
        null
      );
    }

    connectedCallback() {
      if (passthrough) return;

      // Styling reads this to skip effects such as `backdrop-filter` that break over a cross-origin frame.
      if (!this.hasAttribute('data-cross-origin-frame')) this.setAttribute('data-cross-origin-frame', '');
    }

    disconnectedCallback() {
      this.#attachment.release();
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | ((event: never) => void) | null,
      options?: boolean | AddEventListenerOptions
    ) {
      super.addEventListener(type, listener as EventListener, options);
      bridgeEvent(this, type);
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (oldValue !== newValue) this.#apply(name, newValue);
    }

    /** Replay every observed attribute onto the current target, after the target changed underneath them. */
    #hydrate(): void {
      for (const name of routes.observed) {
        if (this.hasAttribute(name)) this.#apply(name, this.getAttribute(name));
      }
    }

    #apply(name: string, value: string | null): void {
      const owner = routes.ownerOf.get(name);

      if (owner) {
        const config = routes.configOf.get(name)!;
        const coerced = coerceAttribute(value, config);

        this.#adapter[owner] = coerced;

        if (config.state && config.state in this.#adapter) this.#adapter[config.state] = coerced;

        return;
      }

      // Anything else the host understands is the inner element's business; a subclass's own attributes are not.
      if (!passthrough || !nativeNames.has(name)) return;

      if (value === null) {
        this.target?.removeAttribute(name);
      } else if (this.target?.getAttribute(name) !== value) {
        this.target?.setAttribute(name, value);
      }
    }
  }

  forwardAdapter(CustomMedia.prototype, Adapter, routes);
  reflectAttributes(CustomMedia.prototype, routes);

  return CustomMedia as any;
}
