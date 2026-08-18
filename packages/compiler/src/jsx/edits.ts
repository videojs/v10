import ts from 'typescript';
import {
  findJsxAttribute,
  hasJsxAttribute,
  type JsxElementLike,
  jsxAttributes,
  singleJsxChildExpression,
  updateJsxAttributes,
} from '../utils/jsx';

interface SetJsxAttributeOptions {
  overwrite?: boolean | undefined;
}

interface ReplaceJsxElementTagOptions {
  attributes?: ts.JsxAttributes | undefined;
  children?: readonly ts.JsxChild[] | undefined;
  preserveTypeArguments?: boolean | undefined;
}

/** Add or replace one JSX attribute while preserving the surrounding element. */
export function setJsxAttribute(
  element: JsxElementLike,
  name: string,
  attribute: ts.JsxAttribute,
  factory: ts.NodeFactory,
  options: SetJsxAttributeOptions = {}
): JsxElementLike | undefined {
  const attributes = jsxAttributes(element);
  const existing = findJsxAttribute(attributes, name);
  if (existing && !options.overwrite) return undefined;

  const properties = existing
    ? attributes.properties.map((property) => (property === existing ? attribute : property))
    : [...attributes.properties, attribute];
  return updateJsxAttributes(element, factory.updateJsxAttributes(attributes, properties), factory);
}

/** Lift one meaningful child into a JSX prop and make the element self-closing. */
export function moveJsxChildToProp(
  element: JsxElementLike,
  prop: string,
  factory: ts.NodeFactory
): ts.JsxSelfClosingElement | undefined {
  if (!ts.isJsxElement(element) || hasJsxAttribute(element.openingElement.attributes, prop)) return undefined;
  const child = singleJsxChildExpression(element.children);
  if (!child) return undefined;

  const attributes = factory.updateJsxAttributes(element.openingElement.attributes, [
    ...element.openingElement.attributes.properties,
    factory.createJsxAttribute(factory.createIdentifier(prop), factory.createJsxExpression(undefined, child)),
  ]);
  return factory.createJsxSelfClosingElement(
    element.openingElement.tagName,
    element.openingElement.typeArguments,
    attributes
  );
}

/** Replace a JSX tag while optionally reshaping its attributes or children. */
export function replaceJsxElementTag(
  element: JsxElementLike,
  tag: ts.JsxTagNameExpression,
  factory: ts.NodeFactory,
  options: ReplaceJsxElementTagOptions = {}
): JsxElementLike {
  const attributes = options.attributes ?? jsxAttributes(element);
  const typeArguments = options.preserveTypeArguments === false ? undefined : typeArgumentsOf(element);
  if (ts.isJsxSelfClosingElement(element) && options.children === undefined) {
    return factory.updateJsxSelfClosingElement(element, tag, typeArguments, attributes);
  }

  const children = options.children ?? (ts.isJsxElement(element) ? element.children : []);
  if (ts.isJsxElement(element)) {
    return factory.updateJsxElement(
      element,
      factory.updateJsxOpeningElement(element.openingElement, tag, typeArguments, attributes),
      children,
      factory.updateJsxClosingElement(element.closingElement, tag)
    );
  }
  return factory.createJsxElement(
    factory.createJsxOpeningElement(tag, typeArguments, attributes),
    children,
    factory.createJsxClosingElement(tag)
  );
}

function typeArgumentsOf(element: JsxElementLike): ts.NodeArray<ts.TypeNode> | undefined {
  return ts.isJsxElement(element) ? element.openingElement.typeArguments : element.typeArguments;
}
