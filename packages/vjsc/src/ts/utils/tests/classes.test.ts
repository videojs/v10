import { describe, expect, it } from 'vitest';

import { parse } from '../../parse';
import { collectClassDeclarations, findClassDeclaration, readStaticStringProperty } from '../classes';

describe('class AST utilities', () => {
  const sourceFile = parse(`
    export class Example {
      static readonly tagName = 'media-example';
      readonly label = 'Example';
    }

    class Other {}
  `).ast;

  it('collects and finds top-level class declarations', () => {
    expect(collectClassDeclarations(sourceFile).map((declaration) => declaration.name?.text)).toEqual([
      'Example',
      'Other',
    ]);
    expect(findClassDeclaration(sourceFile, 'Example')?.name?.text).toBe('Example');
    expect(findClassDeclaration(sourceFile, 'Missing')).toBeUndefined();
  });

  it('reads static string properties', () => {
    const declaration = findClassDeclaration(sourceFile, 'Example')!;

    expect(readStaticStringProperty(declaration, 'tagName')).toBe('media-example');
    expect(readStaticStringProperty(declaration, 'label')).toBeUndefined();
  });
});
