import * as tae from 'typescript-api-extractor';
import { describe, expect, it } from 'vitest';
import { formatDetailedType, formatProperties, formatType, getShortPropType } from '../formatter';

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

  it("returns 'type | function' for short callback unions (< 40 chars, 2 members)", () => {
    const type = 'string | ((state: TimeState) => string)';
    expect(getShortPropType('label', type)).toBe('string | function');
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

  it('passes through description from documentation', () => {
    const props: tae.PropertyNode[] = [
      createPropertyNode('label', 'string', { optional: true, description: 'The button label.' }),
    ];

    const result = formatProperties(props);

    expect(result.label?.description).toBe('The button label.');
  });

  it('passes through default from documentation.defaultValue', () => {
    const props: tae.PropertyNode[] = [
      createPropertyNode('disabled', 'boolean', { optional: true, defaultValue: 'false' }),
    ];

    const result = formatProperties(props);

    expect(result.disabled?.default).toBe('false');
  });

  it('expands type aliases when allExports is provided', () => {
    // Create a property with an ExternalTypeNode referencing 'TimeType'
    const externalType = createExternalTypeNode('TimeType');
    const prop = {
      name: 'type',
      type: externalType,
      optional: true,
      documentation: undefined,
    } as tae.PropertyNode;

    // Create allExports with TimeType resolved to a union
    const timeTypeExport = {
      name: 'TimeType',
      type: createUnionNode([
        createLiteralNode("'current'"),
        createLiteralNode("'duration'"),
        createLiteralNode("'remaining'"),
      ]),
      documentation: undefined,
    } as tae.ExportNode;

    const result = formatProperties([prop], [timeTypeExport]);

    expect(result.type?.type).toBe("'current' | 'duration' | 'remaining'");
  });

  it('sets shortType for callback props', () => {
    const fnType = createFunctionNode([
      {
        parameters: [
          {
            name: 'event',
            type: createIntrinsicNode('Event'),
            optional: false,
            documentation: undefined,
            defaultValue: undefined,
          } as tae.Parameter,
        ],
        returnValueType: createIntrinsicNode('void'),
      } as tae.CallSignature,
    ]);

    const prop = {
      name: 'onClick',
      type: fnType,
      optional: true,
      documentation: undefined,
    } as tae.PropertyNode;

    const result = formatProperties([prop]);

    expect(result.onClick?.shortType).toBe('function');
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

  // --- ExternalTypeNode ---

  it('formats ExternalTypeNode ReactElement to just ReactElement', () => {
    const node = createExternalTypeNode('ReactElement', undefined, [
      { type: createIntrinsicNode('Props'), equalToDefault: false },
    ]);

    expect(formatType(node, false)).toBe('ReactElement');
  });

  it('formats ExternalTypeNode with React namespace by stripping namespace', () => {
    const node = createExternalTypeNode('CSSProperties', ['React']);

    expect(formatType(node, false)).toBe('CSSProperties');
  });

  it('formats ExternalTypeNode with fully qualified name', () => {
    const node = createExternalTypeNode('Baz', ['Foo', 'Bar']);

    expect(formatType(node, false)).toBe('Foo.Bar.Baz');
  });

  it('formats ExternalTypeNode with non-default type arguments', () => {
    const node = createExternalTypeNode('Map', undefined, [
      { type: createIntrinsicNode('string'), equalToDefault: false },
      { type: createIntrinsicNode('number'), equalToDefault: false },
    ]);

    expect(formatType(node, false)).toBe('Map<string, number>');
  });

  // --- IntersectionNode ---

  it('formats IntersectionNode without typeName', () => {
    const node = createIntersectionNode([createIntrinsicNode('string'), createIntrinsicNode('number')]);

    expect(formatType(node, false)).toBe('string & number');
  });

  it('formats IntersectionNode with typeName as fully qualified name', () => {
    const typeName = createTypeName('Combined');
    const node = createIntersectionNode([createIntrinsicNode('string'), createIntrinsicNode('number')], typeName);

    expect(formatType(node, false)).toBe('Combined');
  });

  // --- FunctionNode ---

  it('formats FunctionNode without typeName', () => {
    const node = createFunctionNode([
      {
        parameters: [
          {
            name: 'x',
            type: createIntrinsicNode('string'),
            optional: false,
            documentation: undefined,
            defaultValue: undefined,
          } as tae.Parameter,
        ],
        returnValueType: createIntrinsicNode('void'),
      } as tae.CallSignature,
    ]);

    expect(formatType(node, false)).toBe('((x: string) => void)');
  });

  it('formats FunctionNode with typeName as fully qualified name', () => {
    const typeName = createTypeName('MyHandler');
    const node = createFunctionNode(
      [
        {
          parameters: [],
          returnValueType: createIntrinsicNode('void'),
        } as tae.CallSignature,
      ],
      typeName
    );

    expect(formatType(node, false)).toBe('MyHandler');
  });

  // --- TupleNode ---

  it('formats TupleNode without typeName', () => {
    const node = createTupleNode([createIntrinsicNode('string'), createIntrinsicNode('number')]);

    expect(formatType(node, false)).toBe('[string, number]');
  });

  it('formats TupleNode with typeName as fully qualified name', () => {
    const typeName = createTypeName('Pair');
    const node = createTupleNode([createIntrinsicNode('string'), createIntrinsicNode('number')], typeName);

    expect(formatType(node, false)).toBe('Pair');
  });

  // --- TypeParameterNode ---

  it('formats TypeParameterNode with constraint', () => {
    const node = createTypeParameterNode('T', createIntrinsicNode('string'));

    expect(formatType(node, false)).toBe('string');
  });

  it('formats TypeParameterNode without constraint returns the name', () => {
    const node = createTypeParameterNode('T');

    expect(formatType(node, false)).toBe('T');
  });

  // --- UnionNode with typeName ---

  it('formats UnionNode with typeName as fully qualified name', () => {
    const typeName = createTypeName('Status');
    const node = createUnionNode([createIntrinsicNode('string'), createIntrinsicNode('number')], typeName);

    expect(formatType(node, false)).toBe('Status');
  });

  // --- ObjectNode edge cases ---

  it('formats empty ObjectNode as {}', () => {
    const node = createObjectNode([]);

    expect(formatType(node, false)).toBe('{}');
  });

  // --- Unknown node ---

  it('returns unknown for unrecognized node type', () => {
    const node = {} as tae.AnyType;

    expect(formatType(node, false)).toBe('unknown');
  });

  // --- Union dedup ---

  it('deduplicates union members via uniq', () => {
    const node = createUnionNode([
      createIntrinsicNode('string'),
      createIntrinsicNode('string'),
      createIntrinsicNode('number'),
    ]);

    expect(formatType(node, false)).toBe('string | number');
  });

  // --- TypeParameterNode constraint flattening in union ---

  it('flattens TypeParameterNode constraint in union', () => {
    const constraintUnion = createUnionNode([createIntrinsicNode('string'), createIntrinsicNode('number')]);
    const typeParam = createTypeParameterNode('T', constraintUnion);
    const union = createUnionNode([typeParam, createIntrinsicNode('boolean')]);

    expect(formatType(union, false)).toBe('string | number | boolean');
  });
});

describe('formatDetailedType', () => {
  it('expands ExternalTypeNode when found in allExports', () => {
    const externalType = createExternalTypeNode('TimeType');
    const resolvedUnion = createUnionNode([
      createLiteralNode("'current'"),
      createLiteralNode("'duration'"),
      createLiteralNode("'remaining'"),
    ]);
    const allExports = [{ name: 'TimeType', type: resolvedUnion, documentation: undefined }] as tae.ExportNode[];

    expect(formatDetailedType(externalType, allExports, false)).toBe("'current' | 'duration' | 'remaining'");
  });

  it('returns qualified name when not found in allExports', () => {
    const externalType = createExternalTypeNode('UnknownType');

    expect(formatDetailedType(externalType, [], false)).toBe('UnknownType');
  });

  it('skips re-exported types (reexportedFrom is set)', () => {
    const externalType = createExternalTypeNode('TimeType');
    const resolvedUnion = createUnionNode([createLiteralNode("'current'"), createLiteralNode("'duration'")]);
    const reexport = {
      name: 'TimeType',
      type: resolvedUnion,
      documentation: undefined,
      reexportedFrom: 'OriginalTimeType',
    } as unknown as tae.ExportNode;

    expect(formatDetailedType(externalType, [reexport], false)).toBe('TimeType');
  });

  it('expands UnionNode with typeName (ignores alias, expands members)', () => {
    const typeName = createTypeName('VolumeLevel');
    const union = createUnionNode(
      [
        createLiteralNode("'off'"),
        createLiteralNode("'low'"),
        createLiteralNode("'medium'"),
        createLiteralNode("'high'"),
      ],
      typeName
    );
    const allExports: tae.ExportNode[] = [];

    expect(formatDetailedType(union, allExports, false)).toBe("'off' | 'low' | 'medium' | 'high'");
  });

  it('handles removeUndefined for optional props', () => {
    const union = createUnionNode([createIntrinsicNode('string'), createIntrinsicNode('undefined')]);

    expect(formatDetailedType(union, [], true)).toBe('string');
    expect(formatDetailedType(union, [], false)).toBe('string | undefined');
  });

  it('prevents infinite recursion via visited set', () => {
    const externalType = createExternalTypeNode('SelfRef');
    // SelfRef resolves to itself
    const selfRefExport = {
      name: 'SelfRef',
      type: createExternalTypeNode('SelfRef'),
      documentation: undefined,
    } as tae.ExportNode;

    // Should not stack overflow; falls back to formatType
    expect(formatDetailedType(externalType, [selfRefExport], false)).toBe('SelfRef');
  });

  it('expands IntersectionNode members', () => {
    const externalA = createExternalTypeNode('BaseProps');
    const basePropsExport = {
      name: 'BaseProps',
      type: createObjectNode([{ name: 'id', type: createIntrinsicNode('string'), optional: false }]),
      documentation: undefined,
    } as tae.ExportNode;
    const intersection = createIntersectionNode([externalA, createIntrinsicNode('number')]);

    expect(formatDetailedType(intersection, [basePropsExport], false)).toBe('{ id: string } & number');
  });

  it('delegates non-expandable nodes to formatType', () => {
    const intrinsic = createIntrinsicNode('boolean');

    expect(formatDetailedType(intrinsic, [], false)).toBe('boolean');
  });
});

// --- Helper factories ---

function createPropertyNode(
  name: string,
  typeName: string,
  options: { optional?: boolean; hasIgnoreTag?: boolean; description?: string; defaultValue?: string } = {}
): tae.PropertyNode {
  const type = createIntrinsicNode(typeName);
  const documentation =
    options.hasIgnoreTag || options.description !== undefined || options.defaultValue !== undefined
      ? createDocumentation(options)
      : undefined;

  return {
    name,
    type,
    optional: options.optional ?? false,
    documentation,
  } as tae.PropertyNode;
}

function createDocumentation(options: {
  hasIgnoreTag?: boolean;
  description?: string;
  defaultValue?: string;
}): tae.Documentation {
  return {
    description: options.description,
    defaultValue: options.defaultValue,
    hasTag: (tag: string) => (tag === 'ignore' ? (options.hasIgnoreTag ?? false) : false),
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

function createExternalTypeNode(
  name: string,
  namespaces?: string[],
  typeArguments?: Array<{ type: tae.AnyType; equalToDefault: boolean }>
): tae.ExternalTypeNode {
  const node = Object.create(tae.ExternalTypeNode.prototype);
  node.typeName = createTypeName(name, namespaces, typeArguments);
  return node;
}

function createIntersectionNode(types: tae.AnyType[], typeName?: tae.TypeName): tae.IntersectionNode {
  const node = Object.create(tae.IntersectionNode.prototype);
  node.types = types;
  node.typeName = typeName;
  node.properties = [];
  return node;
}

function createFunctionNode(callSignatures: tae.CallSignature[], typeName?: tae.TypeName): tae.FunctionNode {
  const node = Object.create(tae.FunctionNode.prototype);
  node.callSignatures = callSignatures;
  node.typeName = typeName;
  return node;
}

function createTupleNode(types: tae.AnyType[], typeName?: tae.TypeName): tae.TupleNode {
  const node = Object.create(tae.TupleNode.prototype);
  node.types = types;
  node.typeName = typeName;
  return node;
}

function createTypeParameterNode(name: string, constraint?: tae.AnyType): tae.TypeParameterNode {
  const node = Object.create(tae.TypeParameterNode.prototype);
  node.name = name;
  node.constraint = constraint;
  return node;
}

function createTypeName(
  name: string,
  namespaces?: string[],
  typeArguments?: Array<{ type: tae.AnyType; equalToDefault: boolean }>
): tae.TypeName {
  return new tae.TypeName(name, namespaces, typeArguments);
}
