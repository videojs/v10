import ts from 'typescript';

const IDENTIFIER_NAME_RE = /^[$A-Z_a-z][$\w]*$/;

/** A JSX element that helpers can transform: either an open/close pair or self-closing. */
export type JsxElementLike = ts.JsxElement | ts.JsxSelfClosingElement;

/** A JSX node that can be lifted into an element-valued prop. */
export type JsxElementChild = JsxElementLike | ts.JsxFragment;

/** One named JSX prop with an expression value and its owning element. */
export interface JsxPropReference {
  readonly element: JsxElementLike;
  readonly attribute: ts.JsxAttribute;
  readonly expression: ts.Expression;
}

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

/** Read one named JSX prop whose value can be represented as an expression. */
export function readJsxProp(element: JsxElementLike, name: string): JsxPropReference | undefined {
  const attribute = findJsxAttribute(jsxAttributes(element), name);
  if (!attribute) return undefined;
  const expression = readJsxAttributeExpression(attribute);
  return expression ? { element, attribute, expression } : undefined;
}

/** Replace the value of a prop returned by `readJsxProp`. */
export function replaceJsxPropValue(
  reference: JsxPropReference,
  expression: ts.Expression,
  factory: ts.NodeFactory
): JsxElementLike {
  const attribute = factory.updateJsxAttribute(
    reference.attribute,
    reference.attribute.name,
    ts.isStringLiteral(expression) ? expression : factory.createJsxExpression(undefined, expression)
  );
  const attributes = jsxAttributes(reference.element);
  const nextAttributes = factory.updateJsxAttributes(
    attributes,
    attributes.properties.map((property) => (property === reference.attribute ? attribute : property))
  );
  return updateJsxAttributes(reference.element, nextAttributes, factory);
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

/** Read an identifier and property-access expression as path segments. */
export function readAccessPath(expression: ts.Expression): readonly string[] | undefined {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (!ts.isPropertyAccessExpression(expression) || expression.questionDotToken) return undefined;
  const head = readAccessPath(expression.expression);
  return head ? [...head, expression.name.text] : undefined;
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

export function jsxAttributes(element: JsxElementLike): ts.JsxAttributes {
  return ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
}

export function readJsxAttributeExpression(attribute: ts.JsxAttribute): ts.Expression | undefined {
  const initializer = attribute.initializer;
  if (!initializer) return undefined;
  if (ts.isStringLiteral(initializer)) return initializer;
  return ts.isJsxExpression(initializer) ? initializer.expression : undefined;
}

export function updateJsxAttributes(
  element: JsxElementLike,
  attributes: ts.JsxAttributes,
  factory: ts.NodeFactory
): JsxElementLike {
  if (ts.isJsxElement(element)) {
    const opening = element.openingElement;
    return factory.updateJsxElement(
      element,
      factory.updateJsxOpeningElement(opening, opening.tagName, opening.typeArguments, attributes),
      element.children,
      element.closingElement
    );
  }
  return factory.updateJsxSelfClosingElement(element, element.tagName, element.typeArguments, attributes);
}
