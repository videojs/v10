import { isBoolean, isFunction, isNumber, isString } from '@videojs/utils/predicate';
import { kebabCase } from '@videojs/utils/string';
import type { Constructor } from '@videojs/utils/types';

import type { HostAttributeConfig, HostAttributeConfigs } from './host-attributes';

/**
 * The media properties whose content attribute is not their kebab-cased name, plus the one attribute that seeds live
 * state: a `muted` attribute is `defaultMuted` by the HTML spec, but the page that writes it means to start muted.
 */
export const mediaAttributeConfigs: Readonly<Record<string, Pick<HostAttributeConfig, 'attribute' | 'state'>>> = {
  autoPictureInPicture: { attribute: 'autopictureinpicture' },
  controlsList: { attribute: 'controlslist' },
  crossOrigin: { attribute: 'crossorigin' },
  defaultMuted: { attribute: 'muted', state: 'muted' },
  disablePictureInPicture: { attribute: 'disablepictureinpicture' },
  disableRemotePlayback: { attribute: 'disableremoteplayback' },
  playsInline: { attribute: 'playsinline' },
};

/** Live playback state has no content attribute, even when an adapter lists a default for it. */
export const stateProps: ReadonlySet<string> = new Set(['muted', 'volume', 'currentTime', 'playbackRate']);

/** The content attribute a property is driven by: its WHATWG spelling if it has one, else kebab-case. */
export function attributeName(prop: string, config?: HostAttributeConfig): string {
  return config?.attribute ?? mediaAttributeConfigs[prop]?.attribute ?? kebabCase(prop);
}

/**
 * The content attributes an adapter's `defaultProps` declare: one per primitive default, typed by that default and
 * reset to it when the attribute is removed.
 *
 * Object defaults such as `source` stay property-only, and so does a boolean that defaults to `true`: an HTML boolean
 * attribute cannot say "absent means true", so `<x playsinline>` could never turn it off.
 */
export function derivedAttributes(defaultProps: object): HostAttributeConfigs {
  const configs: HostAttributeConfigs = {};

  for (const [prop, value] of Object.entries(defaultProps)) {
    if (stateProps.has(prop) || value === true) continue;

    const type = isBoolean(value) ? Boolean : isNumber(value) ? Number : isString(value) ? String : undefined;
    if (!type) continue;

    const { state } = mediaAttributeConfigs[prop] ?? {};

    configs[prop] = { type, attribute: attributeName(prop), empty: value, ...(state && { state }) };
  }

  return configs;
}

/**
 * The adapter's props as an element's initial attributes set them: `defaultProps` with each declared attribute that is
 * present coerced over it. What a template needs to build an embed URL before the adapter has attached.
 */
export function propsFromAttributes<Adapter extends { readonly defaultProps: object }>(
  Adapter: Adapter,
  attrs: Record<string, string>
): Adapter['defaultProps'] {
  const props: Record<string, unknown> = { ...Adapter.defaultProps };

  for (const [prop, config] of Object.entries(derivedAttributes(Adapter.defaultProps))) {
    const attribute = config.attribute!;
    if (!(attribute in attrs)) continue;

    props[prop] = coerceAttribute(attrs[attribute]!, config);

    if (config.state && config.state in props) props[config.state] = props[prop];
  }

  return props as Adapter['defaultProps'];
}

/**
 * Coerce an attribute string to the type its config declares. A removed attribute, or a number that does not parse,
 * falls back to the config's `empty` value.
 */
export function coerceAttribute(value: string | null, config: HostAttributeConfig): unknown {
  if (config.type === Boolean) return value !== null;

  const empty = 'empty' in config ? config.empty : config.type === Number ? 0 : '';

  if (value === null) return empty;

  if (config.type !== Number) return value;

  const number = Number(value);

  return Number.isNaN(number) ? empty : number;
}

/**
 * How an element routes its content attributes.
 *
 * A property from `defaultProps` owns its attribute by definition: the attribute writes the adapter, and the property
 * writes the attribute. A native attribute is owned by the adapter property of the same name when the adapter can set
 * it, so an engine can intercept `preload`; otherwise the element reflects it and copies it onto the inner element.
 */
export interface AttributeRoutes {
  /** Attribute names to observe, in declaration order. */
  observed: string[];
  /** Adapter property by attribute name, for the attributes an adapter property owns. */
  ownerOf: Map<string, string>;
  /** Attribute name by adapter property, for the properties that reflect through one. */
  attributeOf: Map<string, string>;
  /** Config by attribute name, for coercion. */
  configOf: Map<string, HostAttributeConfig>;
  /** Properties with no adapter counterpart to write: they only reflect their attribute. */
  reflected: Map<string, { attribute: string; config: HostAttributeConfig }>;
}

/**
 * @param host - The host target's own attributes, owned by the adapter only where it can set the property.
 * @param derived - The adapter's declared attributes, owned by the adapter unless it exposes the property read-only.
 * @param Adapter - The adapter class, for its prototype.
 */
export function buildRoutes(
  host: HostAttributeConfigs,
  derived: HostAttributeConfigs,
  Adapter: Constructor<object>
): AttributeRoutes {
  const routes: AttributeRoutes = {
    observed: [],
    ownerOf: new Map(),
    attributeOf: new Map(),
    configOf: new Map(),
    reflected: new Map(),
  };
  const configs: Record<string, { config: HostAttributeConfig; owned: boolean }> = {};

  for (const [prop, config] of Object.entries(host)) {
    configs[prop] = { config, owned: accessorOf(Adapter.prototype, prop)?.set !== undefined };
  }

  for (const [prop, config] of Object.entries(derived)) {
    const accessor = accessorOf(Adapter.prototype, prop);
    const readOnly = !!accessor?.get && !accessor.set;

    if (__DEV__ && readOnly) {
      console.warn(
        `[videojs] ${Adapter.name}.defaultProps lists \`${prop}\`, but the adapter exposes it read-only; its attribute reflects without reaching the adapter.`
      );
    }

    configs[prop] = { config, owned: !readOnly };
  }

  for (const [prop, { config, owned }] of Object.entries(configs)) {
    const attribute = attributeName(prop, config);

    if (!routes.configOf.has(attribute)) routes.observed.push(attribute);

    routes.configOf.set(attribute, config);

    if (owned) {
      routes.ownerOf.set(attribute, prop);
      routes.attributeOf.set(prop, attribute);
    } else {
      routes.reflected.set(prop, { attribute, config });
    }
  }

  return routes;
}

/** The accessor descriptor a prototype chain declares for a property, if any. */
export function accessorOf(prototype: object, prop: string): PropertyDescriptor | undefined {
  for (let proto = prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    if (descriptor) return isFunction(descriptor.get) || isFunction(descriptor.set) ? descriptor : undefined;
  }

  return undefined;
}
