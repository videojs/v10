import { type JsxElementLike, type JsxPropReference, readAccessPath, readJsxProp } from '@videojs/compiler/ast';
import ts from 'typescript';

export type ClassNameSegment =
  | { kind: 'literal'; value: string; node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral }
  | { kind: 'token'; path: readonly string[]; node: ts.PropertyAccessExpression | ts.Identifier }
  | { kind: 'opaque'; node: ts.Expression };

export type ClassNameInfo =
  | (JsxPropReference & { kind: 'segments'; segments: readonly ClassNameSegment[] })
  | (JsxPropReference & { kind: 'opaque' });

/** Read and statically decompose one JSX `className` attribute. */
export function readClassName(element: JsxElementLike): ClassNameInfo | undefined {
  const prop = readJsxProp(element, 'className');
  return prop ? decomposeClassName(prop) : undefined;
}

export function classNameSegment(expression: ts.Expression): ClassNameSegment {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { kind: 'literal', value: expression.text, node: expression };
  }
  const path = readAccessPath(expression);
  return path
    ? { kind: 'token', path, node: expression as ts.Identifier | ts.PropertyAccessExpression }
    : { kind: 'opaque', node: expression };
}

function decomposeClassName(prop: JsxPropReference): ClassNameInfo {
  const { expression } = prop;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return {
      ...prop,
      kind: 'segments',
      segments: [classNameSegment(expression)],
    };
  }

  if (ts.isPropertyAccessExpression(expression) || ts.isIdentifier(expression)) {
    return {
      ...prop,
      kind: 'segments',
      segments: [classNameSegment(expression)],
    };
  }

  if (ts.isArrayLiteralExpression(expression) && !expression.elements.some(ts.isSpreadElement)) {
    return {
      ...prop,
      kind: 'segments',
      segments: expression.elements.map((item) => classNameSegment(item as ts.Expression)),
    };
  }

  return { ...prop, kind: 'opaque' };
}
