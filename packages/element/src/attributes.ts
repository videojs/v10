import { setAttributeValue } from '@videojs/utils/dom';
import { isFunction } from '@videojs/utils/predicate';

export type AttributeValue = boolean | number | string | null;

export type AttributeType = BooleanConstructor | NumberConstructor | StringConstructor;

interface AttributeDeclarationOptions<Value> {
  /** The attribute name. Set to `false` to keep the property off the element's attribute surface. */
  readonly attribute?: string | false;
  /** Value used when the attribute is removed or a numeric value does not parse. */
  readonly defaultValue?: Value;
}

/** Converts between an attribute's string representation and its property value. */
export interface AttributeConverter<Value = unknown> {
  fromAttribute?(value: string | null): Value;
  toAttribute?(value: Value): string | null;
}

export interface BooleanAttributeDeclaration extends AttributeDeclarationOptions<boolean> {
  readonly type: BooleanConstructor;
  readonly converter?: never;
}

export interface NumberAttributeDeclaration extends AttributeDeclarationOptions<number | null> {
  readonly type: NumberConstructor;
  readonly converter?: never;
}

export interface StringAttributeDeclaration extends AttributeDeclarationOptions<string | null> {
  readonly type?: StringConstructor;
  readonly converter?: never;
}

export interface CustomAttributeDeclaration<Value> extends AttributeDeclarationOptions<Value> {
  readonly type?: AttributeType;
  readonly converter: AttributeConverter<Value>;
}

type BuiltInAttributeDeclaration<Value> = Value extends boolean
  ? BooleanAttributeDeclaration
  : Value extends number
    ? NumberAttributeDeclaration
    : Value extends string | null
      ? StringAttributeDeclaration
      : never;

/** Declares how one element property is represented by a content attribute. */
export type AttributeDeclaration<Value = AttributeValue> =
  | BuiltInAttributeDeclaration<Value>
  | CustomAttributeDeclaration<Value>;

interface AttributeDeclarationShape {
  readonly type?: unknown;
  readonly attribute?: boolean | string;
  readonly defaultValue?: unknown;
  readonly converter?:
    | ((value: string | null, type?: unknown) => unknown)
    | {
        fromAttribute?(value: string | null, type?: unknown): unknown;
        toAttribute?(value: unknown, type?: unknown): unknown;
      };
}

/** The property value produced by a resolved attribute declaration. */
export type AttributeValueFor<Declaration> =
  Declaration extends CustomAttributeDeclaration<infer Value>
    ? Value
    : Declaration extends { readonly converter: (value: string | null, type?: unknown) => infer Value }
      ? Value
      : Declaration extends {
            readonly converter: { fromAttribute(value: string | null, type?: unknown): infer Value };
          }
        ? Value
        : Declaration extends {
              readonly converter: { toAttribute(value: infer Value, type?: unknown): unknown };
            }
          ? Value
          : Declaration extends BooleanAttributeDeclaration
            ? boolean
            : Declaration extends NumberAttributeDeclaration
              ? number | null
              : Declaration extends StringAttributeDeclaration
                ? string | null
                : Declaration extends { readonly type: ObjectConstructor }
                  ? object | null
                  : Declaration extends { readonly type: ArrayConstructor }
                    ? unknown[] | null
                    : never;

export type AttributeDeclarationMap<Declaration extends AttributeDeclarationShape = AttributeDeclaration> = Readonly<
  Record<string, Declaration>
>;

/** Attribute declarations whose keys and values are checked against an element's property surface. */
export type AttributeDeclarationsFor<Properties extends object, Extension extends object = object> = {
  readonly [Property in Extract<keyof Properties, string>]?: AttributeDeclaration<Properties[Property]> & Extension;
};

/** A declaration resolved to its property and content-attribute names. */
export interface AttributeBinding<
  Declaration extends AttributeDeclarationShape = AttributeDeclaration,
  Property extends string = string,
> {
  readonly property: Property;
  readonly attribute: string;
  readonly declaration: Declaration;
}

/** Attribute bindings indexed in both directions for element callbacks and property accessors. */
export interface AttributeBindings<
  Declaration extends AttributeDeclarationShape = AttributeDeclaration,
  Property extends string = string,
> {
  readonly observedAttributes: readonly string[];
  readonly byAttribute: ReadonlyMap<string, AttributeBinding<Declaration, Property>>;
  readonly byProperty: ReadonlyMap<Property, AttributeBinding<Declaration, Property>>;
}

export interface CreateAttributeBindingsOptions<Declaration extends AttributeDeclarationShape = AttributeDeclaration> {
  /** Resolve an implicit attribute name. Defaults to the lowercased property name used by custom elements. */
  readonly attributeName?: (property: string, declaration: Declaration) => string;
}

/** Resolve property declarations into unique, lowercase attribute bindings. */
export function createAttributeBindings<
  const Declarations extends Readonly<Record<string, AttributeDeclarationShape>>,
  Property extends Extract<keyof Declarations, string> = Extract<keyof Declarations, string>,
>(
  declarations: Declarations,
  options: CreateAttributeBindingsOptions<Declarations[Property]> = {}
): AttributeBindings<Declarations[Property], Property> {
  const observedAttributes: string[] = [];
  const byAttribute = new Map<string, AttributeBinding<Declarations[Property], Property>>();
  const byProperty = new Map<Property, AttributeBinding<Declarations[Property], Property>>();

  for (const [untypedProperty, untypedDeclaration] of Object.entries(declarations)) {
    const declaration = untypedDeclaration as Declarations[Property];
    if (declaration.attribute === false) continue;

    const property = untypedProperty as Property;
    const configuredAttribute = declaration.attribute;
    const attribute =
      typeof configuredAttribute === 'string'
        ? configuredAttribute
        : (options.attributeName?.(property, declaration) ?? property.toLowerCase());

    if (!attribute || attribute !== attribute.toLowerCase()) {
      throw new TypeError(
        `Attribute for \`${property}\` must be a non-empty lowercase name; received \`${attribute}\`.`
      );
    }

    const existing = byAttribute.get(attribute);

    if (existing) {
      throw new TypeError(
        `Attribute \`${attribute}\` cannot represent both \`${existing.property}\` and \`${property}\`.`
      );
    }

    const binding = { property, attribute, declaration };

    observedAttributes.push(attribute);
    byAttribute.set(attribute, binding);
    byProperty.set(property, binding);
  }

  return { observedAttributes, byAttribute, byProperty };
}

/** Parse an attribute through its declaration. */
export function valueFromAttribute<Declaration extends AttributeDeclarationShape>(
  value: string | null,
  declaration: Declaration
): AttributeValueFor<Declaration> {
  const converter = declaration.converter;
  if (isFunction(converter)) return converter(value, declaration.type) as AttributeValueFor<Declaration>;

  if (converter?.fromAttribute) {
    return converter.fromAttribute(value, declaration.type) as AttributeValueFor<Declaration>;
  }

  if (declaration.type === Boolean) return (value !== null) as AttributeValueFor<Declaration>;

  if (value === null) {
    return (
      Object.hasOwn(declaration, 'defaultValue') ? declaration.defaultValue : null
    ) as AttributeValueFor<Declaration>;
  }

  if (declaration.type === Number) {
    const number = Number(value);

    return (
      Number.isNaN(number) && Object.hasOwn(declaration, 'defaultValue') ? declaration.defaultValue : number
    ) as AttributeValueFor<Declaration>;
  }

  if (declaration.type === Object || declaration.type === Array) {
    try {
      return JSON.parse(value) as AttributeValueFor<Declaration>;
    } catch {
      return null as AttributeValueFor<Declaration>;
    }
  }

  return value as AttributeValueFor<Declaration>;
}

/** Serialize a property value through its attribute declaration. */
export function valueToAttribute<Declaration extends AttributeDeclarationShape>(
  value: AttributeValueFor<Declaration>,
  declaration: Declaration
): string | null {
  const converter = declaration.converter;

  if (!isFunction(converter) && converter?.toAttribute) {
    const converted = converter.toAttribute(value, declaration.type);

    return converted == null ? null : String(converted);
  }

  if (declaration.type === Boolean) return value ? '' : null;

  if (declaration.type === Object || declaration.type === Array) {
    return value == null ? null : (JSON.stringify(value) ?? null);
  }

  return value === null ? null : String(value);
}

/** @internal Write a property value to the content attribute represented by a binding. */
export function setAttributeFromValue<Declaration extends AttributeDeclarationShape>(
  element: Element,
  binding: AttributeBinding<Declaration>,
  value: AttributeValueFor<Declaration>
): void {
  setAttributeValue(element, binding.attribute, valueToAttribute(value, binding.declaration));
}

/** Define an attribute-backed property unless the prototype already declares it. */
export function defineAttributeProperty<Declaration extends AttributeDeclarationShape>(
  prototype: Element,
  binding: AttributeBinding<Declaration>
): boolean {
  if (binding.property in prototype) return false;

  Object.defineProperty(prototype, binding.property, {
    get(this: Element) {
      return valueFromAttribute(this.getAttribute(binding.attribute), binding.declaration);
    },
    set(this: Element, value: unknown) {
      setAttributeFromValue(this, binding, value as AttributeValueFor<Declaration>);
    },
    enumerable: true,
    configurable: true,
  });

  return true;
}

function takeOwnProperties(element: Element, properties: Iterable<string>): Map<string, unknown> {
  const captured = new Map<string, unknown>();

  for (const property of properties) {
    if (!Object.hasOwn(element, property)) continue;

    captured.set(property, Reflect.get(element, property));

    if (!Reflect.deleteProperty(element, property)) {
      throw new TypeError(`Cannot upgrade non-configurable property \`${property}\`.`);
    }
  }

  return captured;
}

/**
 * Capture properties that need replaying through accessors after custom-element upgrade and subclass initialization.
 *
 * Create the callback in the base constructor, then call it once from `connectedCallback()`. Values assigned before
 * registration win over subclass field defaults; otherwise the field value is replayed through the prototype accessor.
 *
 * @internal
 */
export function saveInstanceProperties(element: Element, properties: Iterable<string>): () => void {
  const propertyNames = [...properties];
  const authored = takeOwnProperties(element, propertyNames);
  let upgraded = false;

  return () => {
    if (upgraded) return;

    upgraded = true;

    const initialized = takeOwnProperties(element, propertyNames);

    for (const property of propertyNames) {
      const values = authored.has(property) ? authored : initialized;

      if (values.has(property)) Reflect.set(element, property, values.get(property));
    }
  };
}
