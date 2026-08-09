import ts from 'typescript';

type JsxElement = ts.JsxElement | ts.JsxSelfClosingElement;

export type ClassNameSegment =
  | { kind: 'literal'; value: string; node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral }
  | { kind: 'token'; path: readonly string[]; node: ts.PropertyAccessExpression | ts.Identifier }
  | { kind: 'opaque'; node: ts.Expression };

interface ClassNameBase {
  element: JsxElement;
  attribute: ts.JsxAttribute;
  expression: ts.Expression;
}

export type ClassNameInfo =
  | (ClassNameBase & { kind: 'segments'; segments: readonly ClassNameSegment[] })
  | (ClassNameBase & { kind: 'opaque' });

/** Read and statically decompose one JSX `className` attribute. */
export function readClassName(element: JsxElement): ClassNameInfo | undefined {
  const attributes = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
  const attribute = attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === 'className'
  );
  if (!attribute) return undefined;

  const expression = readAttributeExpression(attribute);
  if (!expression) return undefined;
  return decomposeClassName(element, attribute, expression);
}

/** Replace a previously read JSX `className` value. */
export function rewriteClassName(info: ClassNameInfo, replacement: ts.Expression, factory: ts.NodeFactory): JsxElement {
  const attribute = factory.updateJsxAttribute(
    info.attribute,
    info.attribute.name,
    ts.isStringLiteral(replacement) ? replacement : factory.createJsxExpression(undefined, replacement)
  );

  if (ts.isJsxElement(info.element)) {
    const opening = info.element.openingElement;
    const attributes = replaceAttribute(opening.attributes, info.attribute, attribute, factory);
    return factory.updateJsxElement(
      info.element,
      factory.updateJsxOpeningElement(opening, opening.tagName, opening.typeArguments, attributes),
      info.element.children,
      info.element.closingElement
    );
  }

  return factory.updateJsxSelfClosingElement(
    info.element,
    info.element.tagName,
    info.element.typeArguments,
    replaceAttribute(info.element.attributes, info.attribute, attribute, factory)
  );
}

export function classNameSegment(expression: ts.Expression): ClassNameSegment {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { kind: 'literal', value: expression.text, node: expression };
  }
  const path = readDottedPath(expression);
  return path
    ? { kind: 'token', path, node: expression as ts.Identifier | ts.PropertyAccessExpression }
    : { kind: 'opaque', node: expression };
}

export function readDottedPath(expression: ts.Expression): readonly string[] | undefined {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (!ts.isPropertyAccessExpression(expression)) return undefined;
  const head = readDottedPath(expression.expression);
  return head ? [...head, expression.name.text] : undefined;
}

function readAttributeExpression(attribute: ts.JsxAttribute): ts.Expression | undefined {
  const initializer = attribute.initializer;
  if (!initializer) return undefined;
  if (ts.isStringLiteral(initializer)) return initializer;
  return ts.isJsxExpression(initializer) ? initializer.expression : undefined;
}

function decomposeClassName(element: JsxElement, attribute: ts.JsxAttribute, expression: ts.Expression): ClassNameInfo {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return {
      element,
      attribute,
      expression,
      kind: 'segments',
      segments: [classNameSegment(expression)],
    };
  }

  if (ts.isPropertyAccessExpression(expression) || ts.isIdentifier(expression)) {
    return {
      element,
      attribute,
      expression,
      kind: 'segments',
      segments: [classNameSegment(expression)],
    };
  }

  if (ts.isArrayLiteralExpression(expression) && !expression.elements.some(ts.isSpreadElement)) {
    return {
      element,
      attribute,
      expression,
      kind: 'segments',
      segments: expression.elements.map((item) => classNameSegment(item as ts.Expression)),
    };
  }

  return { element, attribute, expression, kind: 'opaque' };
}

function replaceAttribute(
  attributes: ts.JsxAttributes,
  current: ts.JsxAttribute,
  replacement: ts.JsxAttribute,
  factory: ts.NodeFactory
): ts.JsxAttributes {
  return factory.updateJsxAttributes(
    attributes,
    attributes.properties.map((property) => (property === current ? replacement : property))
  );
}
