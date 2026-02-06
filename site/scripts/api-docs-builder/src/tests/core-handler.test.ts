import * as tae from 'typescript-api-extractor';
import { describe, expect, it, type MockInstance, vi } from 'vitest';
import { extractCore, extractDefaultProps } from '../core-handler.js';
import { createTestProgram } from './test-utils.js';

vi.mock('typescript-api-extractor', async () => {
  const actual = await vi.importActual<typeof tae>('typescript-api-extractor');
  return {
    ...actual,
    parseFromProgram: vi.fn(),
  };
});

const mockParseFromProgram = tae.parseFromProgram as unknown as MockInstance;

describe('extractDefaultProps', () => {
  it("extracts string literals with quotes ('label' → \"''\")", () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          label: '',
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result.label).toBe("''");
  });

  it("extracts non-empty string literals ('Play' → \"'Play'\")", () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          label: 'Play',
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result.label).toBe("'Play'");
  });

  it('extracts booleans (false → "false")', () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          disabled: false,
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result.disabled).toBe('false');
  });

  it('extracts booleans (true → "true")', () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          enabled: true,
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result.enabled).toBe('true');
  });

  it('extracts null values (null → "null")', () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          value: null,
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result.value).toBe('null');
  });

  it('extracts empty arrays ([] → "[]")', () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          items: [],
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result.items).toBe('[]');
  });

  it('extracts empty objects ({} → "{}")', () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          config: {},
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result.config).toBe('{}');
  });

  it('extracts numeric literals', () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          count: 42,
          ratio: 1.5,
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result.count).toBe('42');
    expect(result.ratio).toBe('1.5');
  });

  it('returns empty object when class not found', () => {
    const code = `
      export class OtherClass {
        static readonly defaultProps = {
          label: 'test',
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result).toEqual({});
  });

  it('returns empty object when no defaultProps property', () => {
    const code = `
      export class MockComponentCore {
        static readonly otherProperty = {
          label: 'test',
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result).toEqual({});
  });

  it('ignores non-static defaultProps', () => {
    const code = `
      export class MockComponentCore {
        readonly defaultProps = {
          label: 'test',
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    expect(result).toEqual({});
  });
});

describe('getPropertyValue', () => {
  it('falls back to getText for complex expressions', () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          label: \`hello \${world}\`,
        };
      }
    `;
    const program = createTestProgram(code);
    const result = extractDefaultProps('test.ts', program, 'MockComponent');

    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal extraction
    expect(result.label).toBe('`hello ${world}`');
  });
});

describe('extractCore', () => {
  function createMockAst(exports: Array<{ name: string; type: unknown; documentation?: unknown }>) {
    return { exports };
  }

  function createMockObjectNode(properties: tae.PropertyNode[]): tae.ObjectNode {
    const node = Object.create(tae.ObjectNode.prototype);
    node.properties = properties;
    return node;
  }

  function createMockIntrinsicNode(intrinsic: string): tae.IntrinsicNode {
    const node = Object.create(tae.IntrinsicNode.prototype);
    node.intrinsic = intrinsic;
    node.typeName = undefined;
    return node;
  }

  function createMockPropertyNode(
    name: string,
    typeName: string,
    options: { optional?: boolean; description?: string; defaultValue?: string } = {}
  ): tae.PropertyNode {
    const type = createMockIntrinsicNode(typeName);
    const documentation =
      options.description !== undefined || options.defaultValue !== undefined
        ? ({
            description: options.description,
            defaultValue: options.defaultValue,
            hasTag: () => false,
          } as unknown as tae.Documentation)
        : undefined;

    return { name, type, optional: options.optional ?? false, documentation } as tae.PropertyNode;
  }

  it('returns null when neither Props nor State export is found', () => {
    const code = 'export const x = 1;';
    const program = createTestProgram(code);

    mockParseFromProgram.mockReturnValueOnce(
      createMockAst([{ name: 'SomethingElse', type: createMockIntrinsicNode('string') }])
    );

    const result = extractCore('test.ts', program, 'MockComponent');

    expect(result).toBeNull();
  });

  it('extracts props when propsExport.type is an ObjectNode', () => {
    const code = 'export const x = 1;';
    const program = createTestProgram(code);

    const propsType = createMockObjectNode([
      createMockPropertyNode('label', 'string', { optional: true }),
      createMockPropertyNode('disabled', 'boolean', { optional: true }),
    ]);

    mockParseFromProgram.mockReturnValueOnce(createMockAst([{ name: 'MockComponentProps', type: propsType }]));

    const result = extractCore('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.props).toHaveLength(2);
    expect(result!.props[0]!.name).toBe('label');
    expect(result!.props[0]!.type).toBe('string');
    expect(result!.props[1]!.name).toBe('disabled');
    expect(result!.props[1]!.type).toBe('boolean');
  });

  it('extracts state when stateExport.type is an ObjectNode', () => {
    const code = 'export const x = 1;';
    const program = createTestProgram(code);

    const stateType = createMockObjectNode([createMockPropertyNode('paused', 'boolean', { optional: false })]);

    mockParseFromProgram.mockReturnValueOnce(createMockAst([{ name: 'MockComponentState', type: stateType }]));

    const result = extractCore('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.state).toHaveLength(1);
    expect(result!.state[0]!.name).toBe('paused');
    expect(result!.state[0]!.type).toBe('boolean');
  });

  it('extracts description from propsExport documentation', () => {
    const code = 'export const x = 1;';
    const program = createTestProgram(code);

    const propsType = createMockObjectNode([createMockPropertyNode('label', 'string', { optional: true })]);

    mockParseFromProgram.mockReturnValueOnce(
      createMockAst([
        {
          name: 'MockComponentProps',
          type: propsType,
          documentation: { description: 'Props for the play button.' },
        },
      ])
    );

    const result = extractCore('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.description).toBe('Props for the play button.');
  });

  it('skips props when propsExport.type is not an ObjectNode', () => {
    const code = 'export const x = 1;';
    const program = createTestProgram(code);

    mockParseFromProgram.mockReturnValueOnce(
      createMockAst([
        { name: 'MockComponentProps', type: createMockIntrinsicNode('string') },
        { name: 'MockComponentState', type: createMockObjectNode([createMockPropertyNode('paused', 'boolean')]) },
      ])
    );

    const result = extractCore('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.props).toHaveLength(0);
    expect(result!.state).toHaveLength(1);
  });

  it('expands type aliases via allExports', () => {
    const code = 'export const x = 1;';
    const program = createTestProgram(code);

    // Create an ExternalTypeNode referencing 'TimeType'
    const externalTypeNode = Object.create(tae.ExternalTypeNode.prototype);
    externalTypeNode.typeName = new tae.TypeName('TimeType');

    const propsType = createMockObjectNode([
      {
        name: 'type',
        type: externalTypeNode,
        optional: true,
        documentation: undefined,
      } as tae.PropertyNode,
    ]);

    // TimeType is also in the exports list with its resolved union type
    const timeTypeLiteral1 = Object.create(tae.LiteralNode.prototype);
    timeTypeLiteral1.value = "'current'";
    const timeTypeLiteral2 = Object.create(tae.LiteralNode.prototype);
    timeTypeLiteral2.value = "'duration'";
    const timeTypeLiteral3 = Object.create(tae.LiteralNode.prototype);
    timeTypeLiteral3.value = "'remaining'";
    const timeTypeUnion = Object.create(tae.UnionNode.prototype);
    timeTypeUnion.types = [timeTypeLiteral1, timeTypeLiteral2, timeTypeLiteral3];
    timeTypeUnion.typeName = undefined;

    mockParseFromProgram.mockReturnValueOnce(
      createMockAst([
        { name: 'MockComponentProps', type: propsType },
        { name: 'TimeType', type: timeTypeUnion },
      ])
    );

    const result = extractCore('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.props[0]!.name).toBe('type');
    expect(result!.props[0]!.type).toBe("'current' | 'duration' | 'remaining'");
  });

  it('merges defaultProps from extractDefaultProps into result', () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          label: 'Play',
        };
      }
    `;
    const program = createTestProgram(code);

    const propsType = createMockObjectNode([createMockPropertyNode('label', 'string', { optional: true })]);

    mockParseFromProgram.mockReturnValueOnce(createMockAst([{ name: 'MockComponentProps', type: propsType }]));

    const result = extractCore('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.defaultProps).toEqual({ label: "'Play'" });
  });
});
