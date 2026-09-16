import type { JSXAttribute, JSXElement, JSXElementName, JSXOpeningElement } from '@oxc-project/types';

/** Find a named JSX attribute on an element or opening element. */
export function findJsxAttribute(node: JSXElement | JSXOpeningElement, name: string): JSXAttribute | undefined {
  const opening = node.type === 'JSXElement' ? node.openingElement : node;

  return opening.attributes.find(
    (attribute): attribute is JSXAttribute =>
      attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === name
  );
}

/** Read a JSX element name as its identifier path. */
export function jsxNamePath(name: JSXElementName): string[] {
  if (name.type === 'JSXIdentifier') return [name.name];

  if (name.type === 'JSXNamespacedName') return [];

  return [...jsxNamePath(name.object), name.property.name];
}
