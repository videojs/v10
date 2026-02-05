import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

function createSourceFile(code: string, fileName = 'test.ts'): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
}

/**
 * Extract data attributes from source code.
 * Mirrors extractDataAttrs from data-attrs-handler.ts for unit testing.
 */
function extractDataAttrs(
  sourceFile: ts.SourceFile,
  componentName: string
): Array<{ name: string; description: string }> | null {
  const attrs: Array<{ name: string; description: string }> = [];
  const possibleNames = [`${componentName}DataAttrs`, `${componentName}DataAttributes`];

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !possibleNames.includes(decl.name.text) || !decl.initializer) {
          continue;
        }

        let objLiteral: ts.ObjectLiteralExpression | undefined;

        if (ts.isObjectLiteralExpression(decl.initializer)) {
          objLiteral = decl.initializer;
        } else if (ts.isAsExpression(decl.initializer) && ts.isObjectLiteralExpression(decl.initializer.expression)) {
          objLiteral = decl.initializer.expression;
        }

        if (!objLiteral) continue;

        for (const prop of objLiteral.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const propName = prop.name.text;
            let dataAttrValue = '';

            if (ts.isStringLiteral(prop.initializer)) {
              dataAttrValue = prop.initializer.text;
            }

            const jsDocComment = getJsDocComment(prop, sourceFile);

            attrs.push({
              name: dataAttrValue || `data-${propName}`,
              description: jsDocComment || '',
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return attrs.length === 0 ? null : attrs;
}

function getJsDocComment(node: ts.PropertyAssignment, sourceFile: ts.SourceFile): string {
  const fullText = sourceFile.getFullText();
  const nodeStart = node.getFullStart();
  const ranges = ts.getLeadingCommentRanges(fullText, nodeStart);

  if (!ranges || ranges.length === 0) return '';

  const lastRange = ranges[ranges.length - 1];
  if (!lastRange) return '';

  const commentText = fullText.substring(lastRange.pos, lastRange.end);

  if (commentText.startsWith('/**')) {
    return commentText
      .replace(/^\/\*\*\s*/, '')
      .replace(/\s*\*\/$/, '')
      .replace(/^\s*\*\s?/gm, '')
      .trim();
  }

  if (commentText.startsWith('//')) {
    return commentText.replace(/^\/\/\s*/, '').trim();
  }

  return '';
}

describe('extractDataAttrs', () => {
  it('extracts from {Name}DataAttrs constant', () => {
    const code = `
      export const MockComponentDataAttrs = {
        active: 'data-active',
        disabled: 'data-disabled',
      } as const;
    `;
    const sourceFile = createSourceFile(code);
    const result = extractDataAttrs(sourceFile, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0]!.name).toBe('data-active');
    expect(result![1]!.name).toBe('data-disabled');
  });

  it('extracts from {Name}DataAttributes constant (alternate naming)', () => {
    const code = `
      export const MockComponentDataAttributes = {
        paused: 'data-paused',
      } as const;
    `;
    const sourceFile = createSourceFile(code);
    const result = extractDataAttrs(sourceFile, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]!.name).toBe('data-paused');
  });

  it('extracts JSDoc comments for each property', () => {
    const code = `
      export const MockComponentDataAttrs = {
        /** Present when the component is active. */
        active: 'data-active',
        /** Present when the component is disabled. */
        disabled: 'data-disabled',
      } as const;
    `;
    const sourceFile = createSourceFile(code);
    const result = extractDataAttrs(sourceFile, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result![0]!.description).toBe('Present when the component is active.');
    expect(result![1]!.description).toBe('Present when the component is disabled.');
  });

  it("handles 'as const' assertion", () => {
    const code = `
      export const MockComponentDataAttrs = {
        value: 'data-value',
      } as const;
    `;
    const sourceFile = createSourceFile(code);
    const result = extractDataAttrs(sourceFile, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
  });

  it('handles object without as const', () => {
    const code = `
      export const MockComponentDataAttrs = {
        value: 'data-value',
      };
    `;
    const sourceFile = createSourceFile(code);
    const result = extractDataAttrs(sourceFile, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
  });

  it('returns null when constant not found', () => {
    const code = `
      export const OtherConstant = {
        value: 'data-value',
      };
    `;
    const sourceFile = createSourceFile(code);
    const result = extractDataAttrs(sourceFile, 'MockComponent');

    expect(result).toBeNull();
  });

  it('falls back to data-{key} when value is not a string literal', () => {
    const code = `
      const PREFIX = 'data-';
      export const MockComponentDataAttrs = {
        active: PREFIX + 'active',
      };
    `;
    const sourceFile = createSourceFile(code);
    const result = extractDataAttrs(sourceFile, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result![0]!.name).toBe('data-active');
  });
});
