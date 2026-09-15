import { preparePropertyUpgrade, valueFromAttribute } from '@videojs/element/attributes';
import type { ShadowTemplateFunction } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';

import { AdapterAttachment } from './attach-adapter';
import { resolveAdapterAttributes, resolveMediaAttributeBindings, type AdapterAttributeOverrides } from './attributes';
import { bridgeEvent, forwardAdapter, reflectAttributes, unbridgeEvents } from './element-surface';
import { createRenderContext } from './render-context';
import type { MediaTargetDefinition, MediaTargetRenderContext } from './targets';

export interface PlaybackAdapter<Target extends EventTarget = EventTarget> extends EventTarget {
  attach(target: Target): void;
  detach(): void;
  destroy(): void;
  /** Index signature for dynamic property forwarding. */
  [key: string]: any;
}

/**
 * An adapter class as an element sees it: constructible without arguments and declaring its configurable properties
 * with their defaults.
 */
export interface PlaybackAdapterConstructor<
  T extends PlaybackAdapter<any> = PlaybackAdapter<any>,
> extends Constructor<T> {
  readonly defaultProps: object;
}

type PlaybackAdapterTarget<T extends PlaybackAdapterConstructor> = NonNullable<
  Parameters<InstanceType<T>['attach']>[0]
>;

export interface PlaybackAdapterDefinition<T extends PlaybackAdapterConstructor> {
  readonly constructor: T;
  /** Partial declaration overrides keyed by adapter default property. Use `false` to disable an attribute. */
  readonly attributes?: AdapterAttributeOverrides<T['defaultProps']>;
}

export interface CustomMediaElementConfig<T extends PlaybackAdapterConstructor> {
  readonly adapter: PlaybackAdapterDefinition<T>;
  readonly target: MediaTargetDefinition<PlaybackAdapterTarget<T>, T['defaultProps']>;
}

type CustomMediaConstructor<T extends PlaybackAdapterConstructor> = Constructor<
  HTMLElement &
    InstanceType<T> & {
      readonly adapter: InstanceType<T>;
      readonly target: PlaybackAdapterTarget<T> | null;
      attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    }
> & {
  template?: ShadowTemplateFunction<MediaTargetRenderContext<T['defaultProps']>>;
  shadowRootOptions: ShadowRootInit;
  readonly observedAttributes: string[];
};

/**
 * Build a custom element around an adapter.
 *
 * The supplied target definition owns rendering and resolving the target. The element attaches its adapter to that
 * target and is the adapter to callers: every method, accessor, and event comes through. Adapter attributes are
 * inferred from primitive `defaultProps`; target-native attributes and how they are applied belong to the target
 * definition.
 *
 * @param config - The playback adapter and the independent definition used to render and manage its target.
 */
export function CustomMediaElement<T extends PlaybackAdapterConstructor>(
  config: CustomMediaElementConfig<T>
): CustomMediaConstructor<T> {
  const { constructor: Adapter, attributes: adapterAttributeOverrides } = config.adapter;
  const { target: definition } = config;
  const targetAttributeDeclarations = definition.attributes ?? {};
  const adapterAttributeDeclarations = resolveAdapterAttributes(Adapter.defaultProps, adapterAttributeOverrides);
  const attributeBindings = resolveMediaAttributeBindings(
    targetAttributeDeclarations,
    adapterAttributeDeclarations,
    Adapter
  );
  let exposedProperties: readonly string[] = [];

  class CustomMedia extends (globalThis.HTMLElement ?? class {}) {
    static template = definition.template;
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };

    static get observedAttributes(): string[] {
      return [...attributeBindings.observedAttributes];
    }

    // SAFETY: `Adapter` is the constructor represented by `T`; TypeScript widens construction through the constraint.
    #adapter = new Adapter() as InstanceType<T>;
    #upgradeProperties: (() => void) | undefined;
    #stopObserving: (() => void) | undefined;
    #attachment = new AdapterAttachment<PlaybackAdapterTarget<T>>(
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

      this.#upgradeProperties = preparePropertyUpgrade(this, exposedProperties);

      const context = createRenderContext(this, attributeBindings, Adapter, adapterAttributeDeclarations);

      definition.render(this, context);

      this.#attachment.attach();
      const stopObserving = definition.observe?.(this, () => {
        // A target that arrives later has seen none of the attributes already on the element.
        if (this.#attachment.attach()) this.#hydrate();
      });

      if (stopObserving) this.#stopObserving = stopObserving;
    }

    /** The adapter owned by this element. The element exclusively manages its attachment lifecycle. */
    get adapter(): InstanceType<T> {
      return this.#adapter;
    }

    /** The concrete target currently selected for the adapter to play through. */
    get target(): PlaybackAdapterTarget<T> | null {
      return definition.resolve(this);
    }

    connectedCallback() {
      this.#upgradeProperties?.();
      this.#upgradeProperties = undefined;

      definition.connected?.(this);
    }

    disconnectedCallback() {
      this.#attachment.detach();
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
      for (const name of attributeBindings.observedAttributes) {
        if (attributes && name in attributes) {
          this.#apply(name, attributes[name]!);
        } else if (this.hasAttribute(name)) {
          this.#apply(name, this.getAttribute(name));
        }
      }
    }

    #apply(name: string, value: string | null): void {
      const binding = attributeBindings.byAttribute.get(name);
      if (!binding) return;

      if (binding.destination === 'adapter') {
        const coerced = valueFromAttribute(value, binding.declaration);
        const adapter: PlaybackAdapter = this.#adapter;

        adapter[binding.property] = coerced;

        const linkedProperty = binding.declaration.linkedProperty;

        if (linkedProperty && linkedProperty in adapter) {
          adapter[linkedProperty] = coerced;
        }

        return;
      }

      const resolvedTarget = this.target;

      if (resolvedTarget) definition.attributeChanged?.(resolvedTarget, name, value);
    }
  }

  exposedProperties = [
    ...forwardAdapter(CustomMedia.prototype, Adapter, attributeBindings),
    ...reflectAttributes(CustomMedia.prototype, attributeBindings),
  ];

  return CustomMedia as any;
}
