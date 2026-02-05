import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

function createSourceFile(code: string, fileName = 'test.ts'): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
}

/**
 * Extract defaultProps from source code using the same logic as core-handler.
 * This mirrors extractDefaultProps from core-handler.ts for unit testing.
 */
function extractDefaultProps(sourceFile: ts.SourceFile, componentName: string): Record<string, string> {
  const defaultProps: Record<string, string> = {};

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name?.text === `${componentName}Core`) {
      for (const member of node.members) {
        if (
          ts.isPropertyDeclaration(member) &&
          member.name &&
          ts.isIdentifier(member.name) &&
          member.name.text === 'defaultProps' &&
          member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
          member.initializer
        ) {
          if (ts.isObjectLiteralExpression(member.initializer)) {
            for (const prop of member.initializer.properties) {
              if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                const propName = prop.name.text;
                const propValue = getPropertyValue(prop.initializer, sourceFile);
                if (propValue !== undefined) {
                  defaultProps[propName] = propValue;
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return defaultProps;
}

function getPropertyValue(node: ts.Expression, sourceFile: ts.SourceFile): string | undefined {
  if (ts.isStringLiteral(node)) return `'${node.text}'`;
  if (ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  if (node.kind === ts.SyntaxKind.NullKeyword) return 'null';
  if (ts.isArrayLiteralExpression(node) && node.elements.length === 0) return '[]';
  if (ts.isObjectLiteralExpression(node) && node.properties.length === 0) return '{}';
  return node.getText(sourceFile);
}

describe('extractDefaultProps', () => {
  it("extracts string literals with quotes ('label' → \"''\")", () => {
    const code = `
      export class MockComponentCore {
        static readonly defaultProps = {
          label: '',
        };
      }
    `;
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

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
    const sourceFile = createSourceFile(code);
    const result = extractDefaultProps(sourceFile, 'MockComponent');

    expect(result).toEqual({});
  });
});
