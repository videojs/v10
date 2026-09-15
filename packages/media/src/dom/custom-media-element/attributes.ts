import {
  createAttributeBindings,
  valueFromAttribute,
  type AttributeBinding,
  type AttributeBindings,
} from '@videojs/element';
import { isBoolean, isFunction, isNumber, isString } from '@videojs/utils/predicate';
import { kebabCase } from '@videojs/utils/string';
import type { Constructor } from '@videojs/utils/types';

import type {
  MediaAttributeDeclaration,
  MediaAttributeDeclarations,
  MediaAttributeDeclarationsFor,
} from './target-attributes';

/** Media properties whose content attribute uses a WHATWG spelling, or initializes another live property. */
export const mediaAttributeMappings: Readonly<
  Record<string, Pick<MediaAttributeDeclaration, 'attribute' | 'linkedProperty'>>
> = {
  autoPictureInPicture: { attribute: 'autopictureinpicture' },
  controlsList: { attribute: 'controlslist' },
  crossOrigin: { attribute: 'crossorigin' },
  defaultMuted: { attribute: 'muted', linkedProperty: 'muted' },
  disablePictureInPicture: { attribute: 'disablepictureinpicture' },
  disableRemotePlayback: { attribute: 'disableremoteplayback' },
  playsInline: { attribute: 'playsinline' },
};

/** Live playback state has no content attribute, even when an adapter lists a default for it. */
export const liveMediaProperties: ReadonlySet<string> = new Set(['muted', 'volume', 'currentTime', 'playbackRate']);

/** The content attribute a property is driven by: its WHATWG spelling if it has one, else kebab-case. */
export function mediaAttributeName(prop: string, declaration?: MediaAttributeDeclaration): string {
  const configured = declaration?.attribute;
  const mapped = mediaAttributeMappings[prop]?.attribute;

  return (isString(configured) && configured) || (isString(mapped) && mapped) || kebabCase(prop);
}

/** Infer content-attribute declarations from an adapter's primitive defaults. */
export function deriveAdapterAttributes<Properties extends object>(
  defaultProps: Properties
): MediaAttributeDeclarationsFor<Properties> {
  const declarations: Record<string, MediaAttributeDeclaration> = {};

  for (const [property, value] of Object.entries(defaultProps)) {
    if (liveMediaProperties.has(property) || value === true) continue;

    const type = isBoolean(value) ? Boolean : isNumber(value) ? Number : isString(value) ? String : undefined;
    if (!type) continue;

    const linkedProperty = mediaAttributeMappings[property]?.linkedProperty;

    declarations[property] = {
      type,
      attribute: mediaAttributeName(property),
      defaultValue: value,
      ...(linkedProperty && { linkedProperty }),
    } as MediaAttributeDeclaration;
  }

  return declarations as MediaAttributeDeclarationsFor<Properties>;
}

type AdapterAttributeOverride<Value> =
  | false
  | ([Value] extends [boolean | number | string]
      ? Partial<MediaAttributeDeclaration<Value>>
      : MediaAttributeDeclaration<Value>);

export type AdapterAttributeOverrides<Properties extends object> = {
  readonly [Property in Extract<keyof Properties, string>]?: AdapterAttributeOverride<Properties[Property]>;
};

/** Merge adapter attribute overrides into the declarations inferred from its defaults. */
export function resolveAdapterAttributes<Properties extends object>(
  defaultProps: Properties,
  overrides: AdapterAttributeOverrides<Properties> = {}
): MediaAttributeDeclarationsFor<Properties> {
  const declarations: Record<string, MediaAttributeDeclaration> = {
    ...(deriveAdapterAttributes(defaultProps) as MediaAttributeDeclarations),
  };

  for (const [property, untypedOverride] of Object.entries(overrides)) {
    const override = untypedOverride as false | Partial<MediaAttributeDeclaration>;

    if (!(property in defaultProps)) {
      throw new TypeError(`Adapter attribute \`${property}\` does not correspond to a default property.`);
    }

    const inferred = declarations[property];

    if (override === false) {
      if (inferred) declarations[property] = { ...inferred, attribute: false };

      continue;
    }

    const declaration = Object.assign({}, inferred, override) as MediaAttributeDeclaration;

    if (!inferred && !declaration.type && !declaration.converter) {
      throw new TypeError(
        `Adapter attribute \`${property}\` cannot be inferred; declare its type or provide a converter.`
      );
    }

    declarations[property] = declaration;
  }

  return declarations as MediaAttributeDeclarationsFor<Properties>;
}

/** @internal Parse initial element attributes over an adapter's defaults. */
export function adapterPropsFromAttributes<Adapter extends { readonly defaultProps: object }>(
  Adapter: Adapter,
  attrs: Record<string, string>,
  declarations: MediaAttributeDeclarationsFor<Adapter['defaultProps']> = deriveAdapterAttributes(Adapter.defaultProps)
): Adapter['defaultProps'] {
  const props = { ...Adapter.defaultProps } as Record<string, unknown>;
  const bindings = createAttributeBindings(declarations as MediaAttributeDeclarations, {
    attributeName: mediaAttributeName,
  });

  for (const binding of bindings.byProperty.values()) {
    if (!(binding.attribute in attrs)) continue;

    props[binding.property] = valueFromAttribute(attrs[binding.attribute]!, binding.declaration);

    const linkedProperty = binding.declaration.linkedProperty;

    if (linkedProperty && linkedProperty in props) props[linkedProperty] = props[binding.property];
  }

  return props as Adapter['defaultProps'];
}

export type MediaAttributeDestination = 'adapter' | 'target';

/** One resolved media attribute binding and the surface that receives its value. */
export interface MediaAttributeBinding extends AttributeBinding<MediaAttributeDeclaration> {
  readonly destination: MediaAttributeDestination;
}

/** Media attribute bindings indexed for element callbacks and property accessors. */
export interface MediaAttributeBindings extends AttributeBindings<MediaAttributeDeclaration> {
  readonly byAttribute: ReadonlyMap<string, MediaAttributeBinding>;
  readonly byProperty: ReadonlyMap<string, MediaAttributeBinding>;
}

/** Resolve target and adapter declarations into one element attribute surface. */
export function resolveMediaAttributeBindings(
  target: MediaAttributeDeclarations,
  adapter: MediaAttributeDeclarations,
  Adapter: Constructor<object>
): MediaAttributeBindings {
  const declarations: Record<string, MediaAttributeDeclaration> = {};
  const destinations = new Map<string, MediaAttributeDestination>();

  for (const [property, declaration] of Object.entries(target)) {
    declarations[property] = declaration;
    destinations.set(property, accessorOf(Adapter.prototype, property)?.set ? 'adapter' : 'target');
  }

  for (const [property, declaration] of Object.entries(adapter)) {
    declarations[property] = declaration;
    destinations.set(property, 'adapter');

    if (declaration.attribute === false) continue;

    const accessor = accessorOf(Adapter.prototype, property);
    const readOnly = !!accessor?.get && !accessor.set;

    if (readOnly) {
      throw new TypeError(
        `${Adapter.name} declares \`${property}\` as an adapter attribute, but the adapter exposes it read-only.`
      );
    }
  }

  const bindings = createAttributeBindings(declarations, { attributeName: mediaAttributeName });
  const mediaBindings = [...bindings.byProperty.values()].map(
    (binding): MediaAttributeBinding => ({ ...binding, destination: destinations.get(binding.property)! })
  );

  return {
    observedAttributes: bindings.observedAttributes,
    byAttribute: new Map(mediaBindings.map((binding) => [binding.attribute, binding])),
    byProperty: new Map(mediaBindings.map((binding) => [binding.property, binding])),
  };
}

/** The accessor descriptor a prototype chain declares for a property, if any. */
export function accessorOf(prototype: object, property: string): PropertyDescriptor | undefined {
  for (let current = prototype; current && current !== Object.prototype; current = Object.getPrototypeOf(current)) {
    const descriptor = Object.getOwnPropertyDescriptor(current, property);
    if (descriptor) return isFunction(descriptor.get) || isFunction(descriptor.set) ? descriptor : undefined;
  }

  return undefined;
}
