import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { isJsxElementLike } from '../../utils/jsx';
import { createJsxEditor } from '../editor';

describe('createJsxEditor', () => {
  it('composes element, prop, and child edits', () => {
    const jsx = createJsxEditor(ts.factory);
    const parent = firstJsxElement('<Root><Marker name="item"><Child /></Marker><Sibling /></Root>');
    const extracted = jsx.children.extractOne(
      parent,
      (child) => jsx.tag.name(child) === 'Marker' && jsx.props.staticString(child, 'name') === 'item'
    );

    expect(extracted).toBeDefined();
    const child = jsx.apply(
      jsx.children.onlyElement(extracted!.child),
      jsx.tag.replace('span'),
      jsx.props.spread(ts.factory.createIdentifier('props'), 'start')
    );
    const result = jsx.apply(
      parent,
      jsx.props.set(
        'render',
        ts.factory.createArrowFunction(
          undefined,
          undefined,
          [ts.factory.createParameterDeclaration(undefined, undefined, 'props')],
          undefined,
          ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          child
        )
      ),
      jsx.children.set(extracted!.rest)
    );

    expect(print(result).replace(/\s+/g, '')).toBe(
      '<Root render={props => <span {...props}/>}>\n    <Sibling />\n</Root>'.replace(/\s+/g, '')
    );
  });

  it('replaces a child in place', () => {
    const jsx = createJsxEditor(ts.factory);
    const parent = firstJsxElement('<Root><Marker /></Root>');
    const marker = jsx.children.extractOne(parent, (child) => jsx.tag.name(child) === 'Marker')!.child;
    const result = jsx.apply(parent, jsx.children.replace(marker, jsx.create.element('template', [marker])));

    expect(print(result)).toBe('<Root><template><Marker /></template></Root>');
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
