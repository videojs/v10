import { isFunction } from '@videojs/utils/predicate';
import type { Constructor, UnionToIntersection } from '@videojs/utils/types';

import { getMediaProp, setMediaProp } from '../utils';
import { MediaHostBase } from './base';

/** How one property of a capability is forwarded to the attached target. */
export interface MediaCapabilityProp<Value> {
  /**
   * Value reported while nothing is attached.
   *
   * This never means "unsupported" — that question is answered by whether the capability is composed at all.
   */
  readonly fallback: Value;
  /** The media reports this value but cannot be told to change it, so no setter is defined. */
  readonly readonly?: true;
}

/** A content attribute the capability wants `CustomMediaElement` to reflect, keyed by the property it drives. */
export interface MediaCapabilityAttribute {
  readonly type: typeof Boolean | typeof Number | typeof String;
  readonly attribute?: string;
  readonly empty?: unknown;
}

/**
 * One media capability, described as data.
 *
 * A descriptor is the single place a capability declares its forwarded properties, the events it emits, and the content
 * attributes it reflects, so the runtime accessors, the element's attribute surface, and capability detection all read
 * from the same source.
 *
 * Capabilities whose surface is more than property forwarding (`play()`, `load()`, or `streamType`'s internal state)
 * need a class body; a descriptor covers the forwarding-only ones, which is most of them.
 */
export interface MediaCapabilityDescriptor<Api extends object = object> {
  readonly name: string;
  /** Events the media dispatches for this capability. */
  readonly events: readonly string[];
  readonly props: { readonly [K in keyof Api]-?: MediaCapabilityProp<Api[K]> };
  readonly attributes?: Readonly<Record<string, MediaCapabilityAttribute>>;
  /** Phantom marker carrying the capability's contract into `createMediaHost`. Never set at runtime. */
  readonly api?: Api;
}

type ApiOf<Descriptor> = Descriptor extends MediaCapabilityDescriptor<infer Api> ? Api : never;

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
 * Curried so the contract is stated explicitly while the descriptor's own keys stay inferred; `props` must then cover
 * every property of the contract, which is what keeps the description and the type from drifting.
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
 * Accessors are defined on the returned class's own fresh prototype, so nothing shared is mutated and a host simply has
 * no property for a capability it did not compose.
 *
 * @example
 *   class GifMediaHost extends createMediaHost([playbackCapability]) {} // no volume
 */
export function createMediaHost<const Capabilities extends readonly MediaCapabilityDescriptor<any>[]>(
  capabilities: Capabilities
): MediaHostConstructor<ComposedMediaApi<Capabilities>> {
  class ComposedMediaHost extends MediaHostBase {
    static readonly capabilities: ReadonlyMap<string, MediaCapabilityDescriptor<any>> = new Map(
      capabilities.map((capability) => [capability.name, capability])
    );
  }

  for (const capability of capabilities) {
    for (const [prop, config] of Object.entries(capability.props) as [string, MediaCapabilityProp<unknown>][]) {
      Object.defineProperty(ComposedMediaHost.prototype, prop, {
        configurable: true,
        get(this: MediaHostBase) {
          return getMediaProp<Record<string, unknown>>(this, prop) ?? config.fallback;
        },
        ...(config.readonly
          ? {}
          : {
              set(this: MediaHostBase, value: unknown) {
                setMediaProp<Record<string, unknown>>(this, prop, value);
              },
            }),
      });
    }
  }

  return ComposedMediaHost as unknown as MediaHostConstructor<ComposedMediaApi<Capabilities>>;
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

/** Content attributes the composed capabilities want reflected, in `CustomMediaElement.properties` form. */
export function getMediaCapabilityAttributes(source: MediaCapabilitySource): Record<string, MediaCapabilityAttribute> {
  return Object.assign({}, ...[...getMediaCapabilities(source).values()].map((capability) => capability.attributes));
}

const EMPTY_CAPABILITIES: ReadonlyMap<string, MediaCapabilityDescriptor<any>> = new Map();
