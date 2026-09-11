import type { Constructor } from '@videojs/utils/types';

import { AdapterAttachment } from './attach-adapter';
import { attributeName, buildRoutes, coerceAttribute, derivedAttributes } from './attributes';
import { bridgeEvent, forwardAdapter, reflectAttributes, unbridgeEvents } from './element-surface';
import type { MediaElementHost } from './hosts';
import { initialAttributes } from './render-host';
import type { MediaTemplate } from './templates';

export interface PlaybackAdapter extends EventTarget {
  attach(target: EventTarget | null): void;
  detach(): void;
  destroy(): void;
  /** Index signature for dynamic property forwarding (includes the adapter's protected `target`). */
  [key: string]: any;
}

/**
 * An adapter class as an element sees it: constructible without arguments and declaring its configurable properties
 * with their defaults.
 */
export interface PlaybackAdapterConstructor<T extends PlaybackAdapter = PlaybackAdapter> extends Constructor<T> {
  readonly defaultProps: object;
}

export interface CustomMediaElementConfig<
  T extends PlaybackAdapterConstructor,
  Target extends EventTarget = EventTarget,
> {
  Adapter: T;
  host: MediaElementHost<Target>;
}

type CustomMediaConstructor<T extends PlaybackAdapterConstructor, Target extends EventTarget> = Constructor<
  HTMLElement &
    InstanceType<T> & {
      readonly adapter: InstanceType<T>;
      readonly target: Target | null;
      attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    }
> & {
  template?: MediaTemplate;
  shadowRootOptions: ShadowRootInit;
  readonly observedAttributes: string[];
};

/**
 * Build a custom element around an adapter.
 *
 * The supplied host owns rendering and resolving the target. The element attaches its adapter to that target and is the
 * adapter to callers: every method, accessor, and event comes through. Adapter attributes are inferred from primitive
 * `defaultProps`; target-native attributes and how they are applied belong to the host.
 *
 * @param config - The playback adapter and the independent host policy used to render and manage its target.
 */
export function CustomMediaElement<T extends PlaybackAdapterConstructor, Target extends EventTarget>(
  config: CustomMediaElementConfig<T, Target>
): CustomMediaConstructor<T, Target> {
  const { Adapter, host } = config;
  const targetAttributes = host.attributes ?? {};
  const hostAttributeNames = new Set(
    Object.entries(targetAttributes).map(([prop, config]) => attributeName(prop, config))
  );
  const routes = buildRoutes(targetAttributes, derivedAttributes(Adapter.defaultProps), Adapter);

  class CustomMedia extends (globalThis.HTMLElement ?? class {}) {
    static template = host.template;
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };

    static get observedAttributes(): string[] {
      return [...routes.observed];
    }

    // SAFETY: `Adapter` is the constructor represented by `T`; TypeScript widens construction through the constraint.
    #adapter = new Adapter() as InstanceType<T>;
    #stopObserving: (() => void) | undefined;
    #attachment = new AdapterAttachment(
      this,
      this.#adapter,
      () => this.target,
      () => {
        unbridgeEvents(this);
        this.#stopObserving?.();
      }
    );

    constructor() {
      super();

      const attributes = initialAttributes(this, routes);

      host.render(this, attributes);

      this.#attachment.attach();
      const stopObserving = host.observe?.(this, () => {
        // A target that arrives later has seen none of the attributes already on the element.
        if (this.#attachment.attach()) this.#hydrate();
      });

      if (stopObserving) this.#stopObserving = stopObserving;

      this.#hydrate(attributes.all);
    }

    get adapter(): InstanceType<T> {
      return this.#adapter;
    }

    /** The target currently selected by the host for the adapter to play through. */
    get target(): Target | null {
      return host.target(this);
    }

    connectedCallback() {
      host.connected?.(this);
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
    #hydrate(attributes?: Record<string, string>): void {
      for (const name of routes.observed) {
        if (attributes && name in attributes) {
          this.#apply(name, attributes[name]!);
        } else if (this.hasAttribute(name)) {
          this.#apply(name, this.getAttribute(name));
        }
      }
    }

    #apply(name: string, value: string | null): void {
      const owner = routes.ownerOf.get(name);

      if (owner) {
        const config = routes.configOf.get(name)!;
        const coerced = coerceAttribute(value, config);
        const adapter: PlaybackAdapter = this.#adapter;

        adapter[owner] = coerced;

        if (config.state && config.state in adapter) adapter[config.state] = coerced;

        return;
      }

      // Anything else the host understands is the target's business; a subclass's own attributes are not.
      const target = this.target;

      if (target && hostAttributeNames.has(name)) host.attributeChanged?.(target, name, value);
    }
  }

  forwardAdapter(CustomMedia.prototype, Adapter, routes);
  reflectAttributes(CustomMedia.prototype, routes);

  return CustomMedia as any;
}
