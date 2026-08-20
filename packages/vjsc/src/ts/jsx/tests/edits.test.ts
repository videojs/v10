import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { isJsxElementLike } from '../../utils/jsx';
import { removeJsxAttribute, replaceJsxElementChildren } from '../edits';

describe('JSX element edits', () => {
  it('removes a named attribute while preserving other attributes', () => {
    const element = firstJsxElement('<Root name="item" className="root" {...props} />');
    const result = removeJsxAttribute(element, 'name', ts.factory);

    expect(print(result)).toBe('<Root className="root" {...props}/>');
  });

  it('replaces children and collapses empty elements when requested', () => {
    const element = firstJsxElement('<Root className="root"><Child /></Root>');
    const result = replaceJsxElementChildren(element, [], ts.factory, { selfClosingWhenEmpty: true });

    expect(print(result)).toBe('<Root className="root"/>');
  });
});

function firstJsxElement(source: string): ts.JsxElement | ts.JsxSelfClosingElement {
  const sourceFile = ts.createSourceFile('input.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result: ts.JsxElement | ts.JsxSelfClosingElement | undefined;

  const visit = (node: ts.Node): void => {
    if (!result && isJsxElementLike(node)) result = node;
    if (!result) ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!result) throw new Error('Expected a JSX element');
  return result;
}

function print(node: ts.Node): string {
  return ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
}
