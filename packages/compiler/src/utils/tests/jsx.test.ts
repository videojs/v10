import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  findJsxAttribute,
  hasJsxAttribute,
  hasJsxSpreadAttribute,
  isJsxElementLike,
  propertyAccess,
  readAccessPath,
  readJsxProp,
  readStringAttribute,
  replaceJsxPropValue,
  singleJsxChildExpression,
  singleJsxElementChild,
} from '../jsx';

describe('JSX attribute utilities', () => {
  it('finds named and spread attributes', () => {
    const element = firstJsxElement(`<Root label="Play" empty dynamic={value} {...props} />`);
    const attributes = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;

    expect(findJsxAttribute(attributes, 'label')).toBeDefined();
    expect(hasJsxAttribute(attributes, 'missing')).toBe(false);
    expect(hasJsxSpreadAttribute(attributes, 'props')).toBe(true);
    expect(readStringAttribute(attributes, 'label')).toBe('Play');
    expect(readStringAttribute(attributes, 'empty')).toBe('');
    expect(readStringAttribute(attributes, 'dynamic')).toBeNull();
    expect(readStringAttribute(attributes, 'missing')).toBeUndefined();
  });

  it('reads and replaces prop values on paired and self-closing elements', () => {
    for (const source of ['<div className={styles.root}></div>', '<span className={styles.label} />']) {
      const element = firstJsxElement(source);
      const prop = readJsxProp(element, 'className');
      if (!prop) throw new Error('Expected a className prop.');

      expect(readAccessPath(prop.expression)).toEqual(['styles', source.startsWith('<div') ? 'root' : 'label']);
      const replacement = replaceJsxPropValue(prop, ts.factory.createStringLiteral('media-root'), ts.factory);
      expect(ts.createPrinter().printNode(ts.EmitHint.Unspecified, replacement, element.getSourceFile())).toContain(
        'className="media-root"'
      );
    }
  });

  it('does not read bare props as expression values', () => {
    expect(readJsxProp(firstJsxElement('<Root disabled />'), 'disabled')).toBeUndefined();
  });
});

describe('singleJsxChildExpression', () => {
  it('returns element and expression children surrounded by whitespace', () => {
    const element = firstJsxElement(`<Root>\n  <Child />\n</Root>`) as ts.JsxElement;
    const expression = firstJsxElement(`<Root>\n  {child}\n</Root>`) as ts.JsxElement;

    expect(singleJsxChildExpression(element.children)).toMatchObject({
      kind: ts.SyntaxKind.JsxSelfClosingElement,
    });
    expect(singleJsxChildExpression(expression.children)).toMatchObject({
      kind: ts.SyntaxKind.Identifier,
      text: 'child',
    });
  });

  it('rejects text, empty expressions, and multiple children', () => {
    const text = firstJsxElement(`<Root>text</Root>`) as ts.JsxElement;
    const empty = firstJsxElement(`<Root>{/* comment */}</Root>`) as ts.JsxElement;
    const multiple = firstJsxElement(`<Root>{one}{two}</Root>`) as ts.JsxElement;

    expect(singleJsxChildExpression(text.children)).toBeNull();
    expect(singleJsxChildExpression(empty.children)).toBeNull();
    expect(singleJsxChildExpression(multiple.children)).toBeNull();
  });
});

describe('singleJsxElementChild', () => {
  it('returns one element child surrounded by whitespace', () => {
    const element = firstJsxElement(`<Root>\n  <Child />\n</Root>`);
    expect(ts.isJsxElement(element)).toBe(true);
    expect(singleJsxElementChild((element as ts.JsxElement).children)).toMatchObject({
      kind: ts.SyntaxKind.JsxSelfClosingElement,
    });
  });

  it('rejects text and multiple element children', () => {
    const text = firstJsxElement(`<Root>text</Root>`) as ts.JsxElement;
    const multiple = firstJsxElement(`<Root><One/><Two/></Root>`) as ts.JsxElement;

    expect(singleJsxElementChild(text.children)).toBeNull();
    expect(singleJsxElementChild(multiple.children)).toBeNull();
  });
});

describe('propertyAccess', () => {
  it('uses element access for names that are not identifiers', () => {
    const expression = propertyAccess(ts.factory, ts.factory.createIdentifier('values'), 'poster-image');
    expect(ts.isElementAccessExpression(expression)).toBe(true);
    expect((expression as ts.ElementAccessExpression).argumentExpression).toMatchObject({ text: 'poster-image' });
  });

  it('reads static access paths and rejects optional access', () => {
    expect(readAccessPath(propertyAccess(ts.factory, ts.factory.createIdentifier('styles'), 'button'))).toEqual([
      'styles',
      'button',
    ]);
    expect(
      readAccessPath(
        ts.factory.createPropertyAccessChain(
          ts.factory.createIdentifier('styles'),
          ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
          'button'
        )
      )
    ).toBeUndefined();
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
