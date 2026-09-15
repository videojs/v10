import { describe, expect, it } from 'vite-plus/test';

import {
  createAttributeBindings,
  defineReflectedAttribute,
  preparePropertyUpgrade,
  setAttributeFromValue,
  valueFromAttribute,
  type AttributeDeclarationsFor,
} from '../attributes';

describe('createAttributeBindings', () => {
  it('resolves lowercase names and omits properties without attributes', () => {
    const bindings = createAttributeBindings({
      label: { type: String },
      closeDelay: { type: Number },
      state: { type: String, attribute: false },
    });

    expect(bindings.observedAttributes).toEqual(['label', 'closedelay']);
    expect(bindings.byAttribute.get('closedelay')?.property).toBe('closeDelay');
    expect(bindings.byProperty.has('state')).toBe(false);
  });

  it('accepts an implicit naming policy', () => {
    const bindings = createAttributeBindings(
      { closeDelay: { type: Number } },
      { attributeName: (property) => (property === 'closeDelay' ? 'close-delay' : property.toLowerCase()) }
    );

    expect(bindings.observedAttributes).toEqual(['close-delay']);
  });

  it('preserves declared property keys in its lookup types', () => {
    const bindings = createAttributeBindings({
      label: { type: String },
      closeDelay: { type: Number },
    });
    const property: 'label' | 'closeDelay' = [...bindings.byProperty.values()][0]!.property;

    expect(property).toBe('label');
  });

  it('types declarations against their corresponding property values', () => {
    const declarations = {
      enabled: { type: Boolean },
      items: {
        converter: {
          fromAttribute: (value: string | null) => value?.split(',') ?? [],
          toAttribute: (value: string[]) => value.join(','),
        },
      },
    } satisfies AttributeDeclarationsFor<{ enabled: boolean; items: string[] }>;

    expect(declarations.enabled.type).toBe(Boolean);

    const invalid = {
      // @ts-expect-error A numeric property cannot use the built-in Boolean conversion contract.
      count: { type: Boolean },
    } satisfies AttributeDeclarationsFor<{ count: number }>;

    expect(invalid.count.type).toBe(Boolean);
  });

  it('rejects duplicate and non-lowercase attribute names', () => {
    expect(() =>
      createAttributeBindings({
        first: { type: String, attribute: 'value' },
        second: { type: String, attribute: 'value' },
      })
    ).toThrow('cannot represent both');
    expect(() => createAttributeBindings({ value: { type: String, attribute: 'dataValue' } })).toThrow('lowercase');
  });
});

describe('attribute value conversion', () => {
  it('converts strings, numbers, booleans, defaults, and invalid numbers', () => {
    expect(valueFromAttribute('label', { type: String })).toBe('label');
    expect(valueFromAttribute('', { type: Boolean })).toBe(true);
    expect(valueFromAttribute(null, { type: Boolean })).toBe(false);
    expect(valueFromAttribute('42', { type: Number })).toBe(42);
    expect(valueFromAttribute(null, { type: Number, defaultValue: 30 })).toBe(30);
    expect(valueFromAttribute('many', { type: Number, defaultValue: 30 })).toBe(30);
  });

  it('supports custom conversion in both directions', () => {
    const declaration = {
      type: String,
      converter: {
        fromAttribute: (value: string | null) => value?.split(',').filter(Boolean).length ?? 0,
        toAttribute: (value: number) => String(value),
      },
    } as const;
    const binding = { property: 'count', attribute: 'count', declaration };
    const element = document.createElement('div');

    expect(valueFromAttribute('a,b', declaration)).toBe(2);
    setAttributeFromValue(element, binding, 3);
    expect(element.getAttribute('count')).toBe('3');
  });
});

describe('defineReflectedAttribute', () => {
  it('defines a symmetrically converted property', () => {
    class TestElement extends HTMLElement {}

    customElements.define('test-reflected-attribute', TestElement);

    const binding = createAttributeBindings({ count: { type: Number, defaultValue: 10 } }).byProperty.get('count')!;

    defineReflectedAttribute(TestElement.prototype, binding);

    // SAFETY: The generated accessor above defines the numeric `count` surface used by this test.
    const element = document.createElement('test-reflected-attribute') as TestElement & { count: number };

    expect(element.count).toBe(10);
    element.count = 20;
    expect(element.getAttribute('count')).toBe('20');
    expect(element.count).toBe(20);
    element.setAttribute('count', 'invalid');
    expect(element.count).toBe(10);
  });

  it('reflects values outside the built-in attribute types through a custom converter', () => {
    class TestElement extends HTMLElement {}

    customElements.define('test-reflected-items', TestElement);

    const binding = createAttributeBindings({
      items: {
        converter: {
          fromAttribute: (value: string | null) => value?.split(',') ?? [],
          toAttribute: (value: string[]) => value.join(','),
        },
      },
    }).byProperty.get('items')!;

    defineReflectedAttribute(TestElement.prototype, binding);

    const element = new TestElement() as TestElement & { items: string[] };

    element.items = ['one', 'two'];
    expect(element.getAttribute('items')).toBe('one,two');
    expect(element.items).toEqual(['one', 'two']);
  });

  it('does not replace an inherited element property', () => {
    class TestElement extends HTMLElement {}

    const binding = createAttributeBindings({ title: { type: String } }).byProperty.get('title')!;

    expect(defineReflectedAttribute(TestElement.prototype, binding)).toBe(false);
    expect(Object.hasOwn(TestElement.prototype, 'title')).toBe(false);
  });
});

describe('preparePropertyUpgrade', () => {
  it('replays authored properties over subclass field defaults through accessors', () => {
    class TestElement extends HTMLElement {
      values: string[] = [];

      set source(value: string) {
        this.values.push(value);
      }
    }

    const values: string[] = [];
    const element = Object.assign(document.createElement('div'), { values });

    Object.defineProperty(element, 'source', { value: 'video.mp4', configurable: true, writable: true });

    const upgrade = preparePropertyUpgrade(element, ['source']);

    Object.setPrototypeOf(element, TestElement.prototype);
    element.values = [];
    Object.defineProperty(element, 'source', { value: 'default.mp4', configurable: true, writable: true });

    upgrade();
    upgrade();
    expect(Object.hasOwn(element, 'source')).toBe(false);
    expect(element.values).toEqual(['video.mp4']);
  });
});
