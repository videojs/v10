import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { createArrowFunction } from '../functions';

describe('createArrowFunction', () => {
  it('creates an arrow function from parameter names and a body', () => {
    const arrow = createArrowFunction(
      ['props', 'item'],
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier('props'),
        ts.factory.createIdentifier('children')
      )
    );

    const source = ts.createSourceFile('test.ts', '', ts.ScriptTarget.Latest);
    const printer = ts.createPrinter();

    expect(printer.printNode(ts.EmitHint.Expression, arrow, source)).toBe('(props, item) => props.children');
  });
});
