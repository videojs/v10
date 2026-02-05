import * as tae from 'typescript-api-extractor';
import { describe, expect, it } from 'vitest';
import { formatProperties, formatType, getShortPropType } from '../formatter';

describe('getShortPropType', () => {
  it("returns 'function' for callback props (onX with =>)", () => {
    expect(getShortPropType('onClick', '(event: Event) => void')).toBe('function');
    expect(getShortPropType('onChange', '(value: string) => void')).toBe('function');
  });

  it("returns 'function' for getter props (getX with =>)", () => {
    expect(getShortPropType('getValue', '() => string')).toBe('function');
    expect(getShortPropType('getState', '() => State')).toBe('function');
  });

  it("returns 'string | function' for className with =>", () => {
    expect(getShortPropType('className', 'string | ((state: State) => string)')).toBe('string | function');
  });

  it("returns 'CSSProperties | function' for style with =>", () => {
    expect(getShortPropType('style', 'CSSProperties | ((state: State) => CSSProperties)')).toBe(
      'CSSProperties | function'
    );
  });

  it("returns 'ReactElement | function' for render with =>", () => {
    expect(getShortPropType('render', 'ReactElement | ((state: State) => ReactElement)')).toBe(
      'ReactElement | function'
    );
  });

  it('returns undefined for simple types (boolean, string, number)', () => {
    expect(getShortPropType('disabled', 'boolean')).toBeUndefined();
    expect(getShortPropType('label', 'string')).toBeUndefined();
    expect(getShortPropType('count', 'number')).toBeUndefined();
  });

  it('returns undefined for short unions (< 3 members and < 40 chars)', () => {
    expect(getShortPropType('size', "'small' | 'large'")).toBeUndefined();
    expect(getShortPropType('value', 'string | number')).toBeUndefined();
  });

  it("returns 'type | function' for unions containing functions", () => {
    const type = "string | ((state: State) => string) | 'auto'";
    expect(getShortPropType('label', type)).toBe("string | 'auto' | function");
  });

  it('returns undefined for complex unions (NOT "Union")', () => {
    // Complex union with 3+ members, no function
    const complexUnion = "'small' | 'medium' | 'large' | 'xlarge'";
    expect(getShortPropType('size', complexUnion)).toBeUndefined();
  });
});

describe('formatProperties', () => {
  it('skips ref prop', () => {
    const props: tae.PropertyNode[] = [
      createPropertyNode('label', 'string', { optional: true }),
      createPropertyNode('ref', 'any', { optional: true }),
    ];

    const result = formatProperties(props);

    expect(result).toHaveProperty('label');
    expect(result).not.toHaveProperty('ref');
  });

  it('skips props with @ignore JSDoc tag', () => {
    const props: tae.PropertyNode[] = [
      createPropertyNode('label', 'string', { optional: true }),
      createPropertyNode('ignoredProp', 'string', { optional: true, hasIgnoreTag: true }),
    ];

    const result = formatProperties(props);

    expect(result).toHaveProperty('label');
    expect(result).not.toHaveProperty('ignoredProp');
  });

  it('sets required: true for non-optional props', () => {
    const props: tae.PropertyNode[] = [
      createPropertyNode('required', 'string', { optional: false }),
      createPropertyNode('optional', 'string', { optional: true }),
    ];

    const result = formatProperties(props);

    expect(result.required?.required).toBe(true);
    expect(result.optional?.required).toBeUndefined();
  });

  it('cleans up undefined values from result', () => {
    const props: tae.PropertyNode[] = [createPropertyNode('simple', 'boolean', { optional: true })];

    const result = formatProperties(props);

    expect(result.simple).toEqual({ type: 'boolean' });
    expect(Object.keys(result.simple!)).not.toContain('shortType');
    expect(Object.keys(result.simple!)).not.toContain('default');
    expect(Object.keys(result.simple!)).not.toContain('required');
  });
});

describe('formatType', () => {
  it('formats IntrinsicNode (boolean, string, number)', () => {
    const boolNode = createIntrinsicNode('boolean');
    const strNode = createIntrinsicNode('string');
    const numNode = createIntrinsicNode('number');

    expect(formatType(boolNode, false)).toBe('boolean');
    expect(formatType(strNode, false)).toBe('string');
    expect(formatType(numNode, false)).toBe('number');
  });

  it('formats UnionNode and removes undefined when optional', () => {
    const unionNode = createUnionNode([createIntrinsicNode('string'), createIntrinsicNode('undefined')]);

    expect(formatType(unionNode, true)).toBe('string');
    expect(formatType(unionNode, false)).toBe('string | undefined');
  });

  it('flattens nested unions', () => {
    const innerUnion = createUnionNode([createIntrinsicNode('string'), createIntrinsicNode('number')]);
    const outerUnion = createUnionNode([innerUnion, createIntrinsicNode('boolean')]);

    expect(formatType(outerUnion, false)).toBe('string | number | boolean');
  });

  it('formats ObjectNode with properties', () => {
    const objNode = createObjectNode([
      { name: 'x', type: createIntrinsicNode('number'), optional: false },
      { name: 'y', type: createIntrinsicNode('number'), optional: true },
    ]);

    expect(formatType(objNode, false)).toBe('{ x: number; y?: number }');
  });

  it('formats ArrayNode with parentheses for complex element types', () => {
    const simpleArray = createArrayNode(createIntrinsicNode('string'));
    const complexArray = createArrayNode(
      createUnionNode([createIntrinsicNode('string'), createIntrinsicNode('number')])
    );

    expect(formatType(simpleArray, false)).toBe('string[]');
    expect(formatType(complexArray, false)).toBe('(string | number)[]');
  });

  it('orders members with null/undefined/any last', () => {
    const unionNode = createUnionNode([
      createIntrinsicNode('null'),
      createIntrinsicNode('string'),
      createIntrinsicNode('undefined'),
      createIntrinsicNode('number'),
    ]);

    expect(formatType(unionNode, false)).toBe('string | number | null | undefined');
  });

  it('normalizes quotes (double to single)', () => {
    const literalNode = createLiteralNode('"hello"');

    expect(formatType(literalNode, false)).toBe("'hello'");
  });
});

// Helper functions to create mock tae nodes

function createPropertyNode(
  name: string,
  typeName: string,
  options: { optional?: boolean; hasIgnoreTag?: boolean; description?: string } = {}
): tae.PropertyNode {
  const type = createIntrinsicNode(typeName);
  const documentation = options.hasIgnoreTag || options.description ? createDocumentation(options) : undefined;

  return {
    name,
    type,
    optional: options.optional ?? false,
    documentation,
  } as tae.PropertyNode;
}

function createDocumentation(options: { hasIgnoreTag?: boolean; description?: string }): tae.Documentation {
  return {
    description: options.description,
    hasTag: (tag: string) => (tag === 'ignore' ? (options.hasIgnoreTag ?? false) : false),
    defaultValue: undefined,
  } as unknown as tae.Documentation;
}

function createIntrinsicNode(intrinsic: string): tae.IntrinsicNode {
  const node = Object.create(tae.IntrinsicNode.prototype);
  node.intrinsic = intrinsic;
  node.typeName = undefined;
  return node;
}

function createUnionNode(types: tae.AnyType[], typeName?: tae.TypeName): tae.UnionNode {
  const node = Object.create(tae.UnionNode.prototype);
  node.types = types;
  node.typeName = typeName;
  return node;
}

function createObjectNode(
  properties: Array<{ name: string; type: tae.AnyType; optional: boolean }>,
  typeName?: tae.TypeName
): tae.ObjectNode {
  const node = Object.create(tae.ObjectNode.prototype);
  node.properties = properties.map((p) => ({
    name: p.name,
    type: p.type,
    optional: p.optional,
  }));
  node.typeName = typeName;
  return node;
}

function createArrayNode(elementType: tae.AnyType): tae.ArrayNode {
  const node = Object.create(tae.ArrayNode.prototype);
  node.elementType = elementType;
  return node;
}

function createLiteralNode(value: string): tae.LiteralNode {
  const node = Object.create(tae.LiteralNode.prototype);
  node.value = value;
  return node;
}
