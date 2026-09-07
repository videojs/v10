import { isBoolean, isFunction, isNumber, isString } from '@videojs/utils/predicate';
import { kebabCase } from '@videojs/utils/string';
import type { Constructor } from '@videojs/utils/types';

import type { AttributeConfig, AttributeConfigs } from '../html-media-adapter';

/** The WHATWG spellings for the media properties whose attribute is not their kebab-cased name. */
export const mediaAttributeNames: Readonly<Record<string, string>> = {
  autoPictureInPicture: 'autopictureinpicture',
  controlsList: 'controlslist',
  crossOrigin: 'crossorigin',
  defaultMuted: 'muted',
  disablePictureInPicture: 'disablepictureinpicture',
  disableRemotePlayback: 'disableremoteplayback',
  playsInline: 'playsinline',
};

/** Live playback state has no content attribute, even when an adapter lists a default for it. */
export const stateProps: ReadonlySet<string> = new Set(['muted', 'volume', 'currentTime', 'playbackRate']);

/** The content attribute a property is driven by: its WHATWG spelling if it has one, else kebab-case. */
export function attributeName(prop: string, config?: AttributeConfig): string {
  return config?.attribute ?? mediaAttributeNames[prop] ?? kebabCase(prop);
}

/**
 * The content attributes an adapter's `defaultProps` declare: one per primitive default, typed by that default and
 * reset to it when the attribute is removed. Object defaults such as `source` stay property-only.
 */
export function derivedAttributes(defaultProps: object): AttributeConfigs {
  const configs: AttributeConfigs = {};

  for (const [prop, value] of Object.entries(defaultProps)) {
    if (stateProps.has(prop)) continue;

    const type = isBoolean(value) ? Boolean : isNumber(value) ? Number : isString(value) ? String : undefined;
    if (!type) continue;

    configs[prop] = { type, attribute: attributeName(prop), empty: value };
  }

  return configs;
}

/** Coerce an attribute string to the type its config declares. */
export function coerceAttribute(value: string | null, config: AttributeConfig): unknown {
  if (config.type === Boolean) return value !== null;

  if (value === null) return 'empty' in config ? config.empty : config.type === Number ? 0 : '';

  return config.type === Number ? Number(value) : value;
}

/**
 * How an element routes its content attributes.
 *
 * An attribute whose property the adapter can set is owned by that property: the attribute writes the adapter, and the
 * property writes the attribute. `defaultMuted` declares `attribute: 'muted'`, but `muted` is a settable property in
 * its own right and owns that attribute, so the alias only reflects it.
 */
export interface AttributeRoutes {
  /** Attribute names to observe, in declaration order. */
  observed: string[];
  /** Adapter property by attribute name, for the attributes an adapter property owns. */
  ownerOf: Map<string, string>;
  /** Attribute name by adapter property, for the properties that reflect through one. */
  attributeOf: Map<string, string>;
  /** Config by attribute name, for coercion. */
  configOf: Map<string, AttributeConfig>;
  /** Properties that only reflect their attribute: aliases and attributes the adapter has no setter for. */
  reflected: Map<string, { attribute: string; config: AttributeConfig }>;
}

export function buildRoutes(configs: AttributeConfigs, Adapter: Constructor<object>): AttributeRoutes {
  const routes: AttributeRoutes = {
    observed: [],
    ownerOf: new Map(),
    attributeOf: new Map(),
    configOf: new Map(),
    reflected: new Map(),
  };

  for (const [prop, config] of Object.entries(configs)) {
    const attribute = attributeName(prop, config);
    const alias =
      config.attribute !== prop && hasSetter(Adapter.prototype, config.attribute) ? config.attribute : undefined;
    const owner = alias ?? (hasSetter(Adapter.prototype, prop) ? prop : undefined);

    if (!routes.configOf.has(attribute)) routes.observed.push(attribute);

    routes.configOf.set(attribute, config);

    if (owner) {
      routes.ownerOf.set(attribute, owner);
      routes.attributeOf.set(owner, attribute);
    }

    if (owner !== prop) routes.reflected.set(prop, { attribute, config });
  }

  return routes;
}

function hasSetter(prototype: object, prop: string | undefined): boolean {
  if (!prop) return false;

  for (let proto = prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    if (descriptor) return isFunction(descriptor.set);
  }

  return false;
}
