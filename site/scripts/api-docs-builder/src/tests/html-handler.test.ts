import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

function createSourceFile(code: string, fileName = 'test.ts'): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
}

/**
 * Extract tagName from source code.
 * Mirrors extractHtml from html-handler.ts for unit testing.
 */
function extractHtml(sourceFile: ts.SourceFile, componentName: string): { tagName: string } | null {
  let tagName = '';

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name?.text === `${componentName}Element`) {
      for (const member of node.members) {
        if (
          ts.isPropertyDeclaration(member) &&
          member.name &&
          ts.isIdentifier(member.name) &&
          member.name.text === 'tagName' &&
          member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
          member.initializer &&
          ts.isStringLiteral(member.initializer)
        ) {
          tagName = member.initializer.text;
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return tagName ? { tagName } : null;
}

describe('extractHtml', () => {
  it('extracts tagName from {Name}Element class', () => {
    const code = `
      export class MockComponentElement {
        static readonly tagName = 'media-mock-component';
      }
    `;
    const sourceFile = createSourceFile(code);
    const result = extractHtml(sourceFile, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.tagName).toBe('media-mock-component');
  });

  it('extracts tagName without readonly modifier', () => {
    const code = `
      export class MockComponentElement {
        static tagName = 'media-mock-component';
      }
    `;
    const sourceFile = createSourceFile(code);
    const result = extractHtml(sourceFile, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.tagName).toBe('media-mock-component');
  });

  it('returns null when Element class not found', () => {
    const code = `
      export class OtherClass {
        static readonly tagName = 'media-other';
      }
    `;
    const sourceFile = createSourceFile(code);
    const result = extractHtml(sourceFile, 'MockComponent');

    expect(result).toBeNull();
  });

  it('returns null when tagName not static', () => {
    const code = `
      export class MockComponentElement {
        readonly tagName = 'media-mock-component';
      }
    `;
    const sourceFile = createSourceFile(code);
    const result = extractHtml(sourceFile, 'MockComponent');

    expect(result).toBeNull();
  });

  it('returns null when tagName is not a string literal', () => {
    const code = `
      const TAG = 'media-mock-component';
      export class MockComponentElement {
        static readonly tagName = TAG;
      }
    `;
    const sourceFile = createSourceFile(code);
    const result = extractHtml(sourceFile, 'MockComponent');

    expect(result).toBeNull();
  });

  it('returns null when no tagName property exists', () => {
    const code = `
      export class MockComponentElement {
        static readonly otherProperty = 'value';
      }
    `;
    const sourceFile = createSourceFile(code);
    const result = extractHtml(sourceFile, 'MockComponent');

    expect(result).toBeNull();
  });
});
