import ts from 'typescript';

const IDENTIFIER_NAME_RE = /^[$A-Z_a-z][$\w]*$/;

/** A JSX element that helpers can transform: either an open/close pair or self-closing. */
export type JsxElementLike = ts.JsxElement | ts.JsxSelfClosingElement;

/** A JSX node that can be lifted into an element-valued prop. */
export type JsxElementChild = JsxElementLike | ts.JsxFragment;

export function isJsxElementLike(node: ts.Node): node is JsxElementLike {
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
}

export function findJsxAttribute(attributes: ts.JsxAttributes, name: string): ts.JsxAttribute | undefined {
  return attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name
  );
}

export function hasJsxAttribute(attributes: ts.JsxAttributes, name: string): boolean {
  return findJsxAttribute(attributes, name) !== undefined;
}

export function hasJsxSpreadAttribute(attributes: ts.JsxAttributes, name: string): boolean {
  return attributes.properties.some(
    (property) =>
      ts.isJsxSpreadAttribute(property) && ts.isIdentifier(property.expression) && property.expression.text === name
  );
}

export function singleJsxElementChild(children: readonly ts.JsxChild[]): JsxElementChild | null {
  let found: JsxElementChild | null = null;

  for (const child of children) {
    if (ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces) continue;
    if (isJsxElementLike(child) || ts.isJsxFragment(child)) {
      if (found) return null;
      found = child;
      continue;
    }
    return null;
  }

  return found;
}

/** Return one meaningful JSX child as an expression, including an expression container. */
export function singleJsxChildExpression(children: readonly ts.JsxChild[]): ts.Expression | null {
  let found: ts.Expression | null = null;

  for (const child of children) {
    if (ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces) continue;

    const expression = ts.isJsxExpression(child) ? child.expression : child;
    if (
      !expression ||
      (!isJsxElementLike(expression) && !ts.isJsxFragment(expression) && !ts.isExpression(expression))
    ) {
      return null;
    }
    if (found) return null;
    found = expression;
  }

  return found;
}

export function jsxExpression(factory: ts.NodeFactory, expression: ts.Expression): ts.JsxExpression {
  return factory.createJsxExpression(undefined, expression);
}

export function accessPath(
  factory: ts.NodeFactory,
  root: string | ts.Expression,
  ...path: readonly string[]
): ts.Expression {
  let expression = typeof root === 'string' ? factory.createIdentifier(root) : root;

  for (const property of path) {
    expression = propertyAccess(factory, expression, property);
  }

  return expression;
}

export function propertyAccess(factory: ts.NodeFactory, expression: ts.Expression, property: string): ts.Expression {
  if (IDENTIFIER_NAME_RE.test(property)) {
    return factory.createPropertyAccessExpression(expression, property);
  }

  return factory.createElementAccessExpression(expression, factory.createStringLiteral(property));
}

export function readStringAttribute(attributes: ts.JsxAttributes, name: string): string | null | undefined {
  const attribute = findJsxAttribute(attributes, name);
  if (!attribute) return undefined;

  const initializer = attribute.initializer;
  if (!initializer) return '';
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    if (ts.isStringLiteral(initializer.expression) || ts.isNoSubstitutionTemplateLiteral(initializer.expression)) {
      return initializer.expression.text;
    }
  }
  return null;
}
