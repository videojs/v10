import { isFunction } from '@videojs/utils/predicate';
import type { Constructor, UnionToIntersection } from '@videojs/utils/types';

import { getMediaOwner, getMediaProp, setMediaProp } from '../utils';
import { MediaHostBase } from './base';

type AnyFunction = (...args: any[]) => any;

type PropertyKeys<Api> = {
  [K in keyof Api]-?: NonNullable<Api[K]> extends AnyFunction ? never : K;
}[keyof Api];

type MethodKeys<Api> = {
  [K in keyof Api]-?: NonNullable<Api[K]> extends AnyFunction ? K : never;
}[keyof Api];

/** How one property of a capability is forwarded to the attached target. */
export interface MediaCapabilityProp<Value> {
  /**
   * Value reported while no owner holds the property.
   *
   * This never means "unsupported" — that question is answered by whether the capability is composed at all.
   */
  readonly fallback: Value;
  /** The media reports this value but cannot be told to change it, so no setter is defined. */
  readonly readonly?: true;
  /** Read the property yourself. Receives the forwarded value, or `undefined` when no owner holds it. */
  readonly get?: (host: MediaHostBase, forwarded: Value | undefined) => Value;
  /** Write the property yourself, for capabilities that keep their own state or announce their own change event. */
  readonly set?: (host: MediaHostBase, value: Value) => void;
}

/** How one method of a capability is forwarded to the attached target. */
export interface MediaCapabilityMethod<Method extends AnyFunction> {
  /** Called when no owner implements the method, or when its result is nullish. */
  readonly fallback: Method;
}

/** A content attribute the capability reflects, keyed by the property it drives. */
export interface MediaCapabilityAttribute {
  readonly type: typeof Boolean | typeof Number | typeof String;
  readonly attribute?: string;
  readonly empty?: unknown;
}

/**
 * One media capability, described as data.
 *
 * A descriptor is the single place a capability declares its forwarded members, the events it emits, and the content
 * attributes it reflects, so the host's accessors, the element's attribute surface, and capability detection all read
 * from the same source. `props` and `methods` must cover the contract exactly, which is what keeps the description and
 * the type from drifting.
 *
 * A capability that needs more than forwarding — its own state, or an event it announces itself — supplies `get` and
 * `set` rather than dropping back to a class body.
 */
export interface MediaCapabilityDescriptor<Api extends object = object> {
  readonly name: string;
  /** Events the media dispatches for this capability. */
  readonly events: readonly string[];
  readonly props: { readonly [K in PropertyKeys<Api>]-?: MediaCapabilityProp<Api[K]> };
  readonly methods?: { readonly [K in MethodKeys<Api>]-?: MediaCapabilityMethod<Extract<Api[K], AnyFunction>> };
  readonly attributes?: Readonly<Record<string, MediaCapabilityAttribute>>;
  /** Phantom marker carrying the capability's contract into `createMediaHost`. Never set at runtime. */
  readonly api?: Api;
}

/** Reads the phantom marker rather than the descriptor's members, which are mapped types and so not inferable. */
type ApiOf<Descriptor> = Descriptor extends { api?: infer Api } ? NonNullable<Api> : never;

/** The instance surface a list of capability descriptors composes to. */
export type ComposedMediaApi<Capabilities extends readonly MediaCapabilityDescriptor<any>[]> = UnionToIntersection<
  ApiOf<Capabilities[number]>
> &
  object;

export interface MediaHostConstructor<Api extends object> extends Constructor<MediaHostBase & Api> {
  readonly capabilities: ReadonlyMap<string, MediaCapabilityDescriptor<any>>;
}

/**
 * Describe a capability against the contract it implements.
 *
 * Curried so the contract is stated explicitly while the descriptor's own keys stay inferred.
 *
 * @example
 *   const volumeCapability = defineMediaCapability<MediaVolumeCapability>()({
 *     name: 'volume',
 *     events: ['volumechange'],
 *     props: { volume: { fallback: 1 }, muted: { fallback: false }, defaultMuted: { fallback: false } },
 *   });
 */
export function defineMediaCapability<Api extends object>() {
  return (descriptor: MediaCapabilityDescriptor<Api>): MediaCapabilityDescriptor<Api> => descriptor;
}

/**
 * Build a media host that exposes exactly the given capabilities.
 *
 * Members are defined on the returned class's own fresh prototype, so nothing shared is mutated and a host simply has
 * no member for a capability it did not compose. Pass a base host to layer capabilities onto an existing one; its
 * capabilities carry over, so `instanceof` and detection keep working down the chain.
 *
 * @example
 *   class GifMediaHost extends createMediaHost([playbackCapability, loopCapability]) {} // no volume
 */
export function createMediaHost<
  const Capabilities extends readonly MediaCapabilityDescriptor<any>[],
  Base extends Constructor<MediaHostBase> = typeof MediaHostBase,
>(
  capabilities: Capabilities,
  BaseClass?: Base
): MediaHostConstructor<InstanceType<Base> & ComposedMediaApi<Capabilities>> {
  const Composed = (BaseClass ?? MediaHostBase) as Constructor<MediaHostBase>;

  class ComposedMediaHost extends Composed {
    static readonly capabilities: ReadonlyMap<string, MediaCapabilityDescriptor<any>> = new Map([
      ...getMediaCapabilities(BaseClass),
      ...capabilities.map((capability) => [capability.name, capability] as const),
    ]);
  }

  for (const capability of capabilities) {
    for (const [name, config] of Object.entries(capability.props) as [string, MediaCapabilityProp<unknown>][]) {
      defineForwardedProp(ComposedMediaHost.prototype, name, config);
    }

    for (const [name, config] of Object.entries(capability.methods ?? {}) as [
      string,
      MediaCapabilityMethod<AnyFunction>,
    ][]) {
      defineForwardedMethod(ComposedMediaHost.prototype, name, config);
    }
  }

  return ComposedMediaHost as unknown as MediaHostConstructor<InstanceType<Base> & ComposedMediaApi<Capabilities>>;
}

function defineForwardedProp(prototype: object, name: string, config: MediaCapabilityProp<unknown>): void {
  const descriptor: PropertyDescriptor = {
    configurable: true,
    get(this: MediaHostBase) {
      const forwarded = getMediaProp<Record<string, unknown>>(this, name);

      return config.get ? config.get(this, forwarded) : (forwarded ?? config.fallback);
    },
  };

  if (!config.readonly) {
    descriptor.set = function (this: MediaHostBase, value: unknown) {
      if (config.set) {
        config.set(this, value);
      } else {
        setMediaProp<Record<string, unknown>>(this, name, value);
      }
    };
  }

  Object.defineProperty(prototype, name, descriptor);
}

function defineForwardedMethod(prototype: object, name: string, config: MediaCapabilityMethod<AnyFunction>): void {
  Object.defineProperty(prototype, name, {
    configurable: true,
    writable: true,
    value(this: MediaHostBase, ...args: unknown[]) {
      const owner = getMediaOwner<Record<string, unknown>>(this, name);
      const method = owner?.[name];
      const result = isFunction(method) ? method.apply(owner, args) : undefined;

      // A nullish result means the owner could not answer, so the capability's
      // own answer stands in — that is how `play()` rejects with no media.
      return result ?? config.fallback.apply(this, args);
    },
  });
}

/** A composed media host, or one of its instances. */
export type MediaCapabilitySource = object | MediaHostConstructor<object> | null | undefined;

/** The capabilities a host class or instance was composed from, empty for a media that declares none. */
export function getMediaCapabilities(
  source: MediaCapabilitySource
): ReadonlyMap<string, MediaCapabilityDescriptor<any>> {
  const ctor = isFunction(source) ? source : source?.constructor;
  const capabilities = (ctor as Partial<MediaHostConstructor<object>> | undefined)?.capabilities;

  return capabilities instanceof Map ? capabilities : EMPTY_CAPABILITIES;
}

/** Whether a media declares the named capability. Only meaningful for hosts built by `createMediaHost`. */
export function supportsMediaCapability(source: MediaCapabilitySource, name: string): boolean {
  return getMediaCapabilities(source).has(name);
}

/** Every event the composed capabilities of a host can emit. */
export function getMediaCapabilityEvents(source: MediaCapabilitySource): string[] {
  return [...getMediaCapabilities(source).values()].flatMap((capability) => [...capability.events]);
}

/** Content attributes the composed capabilities reflect, in `CustomMediaElement.properties` form. */
export function getMediaCapabilityAttributes(source: MediaCapabilitySource): Record<string, MediaCapabilityAttribute> {
  return Object.assign({}, ...[...getMediaCapabilities(source).values()].map((capability) => capability.attributes));
}

const EMPTY_CAPABILITIES: ReadonlyMap<string, MediaCapabilityDescriptor<any>> = new Map();
