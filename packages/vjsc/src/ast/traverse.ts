import type {
  JSXAttribute,
  JSXElement,
  JSXElementName,
  JSXOpeningElement,
  Node,
  Function as OxcFunction,
} from '@oxc-project/types';
import { walk } from 'oxc-walker';

/** Collect function declarations beneath an AST node in source order. */
export function collectFunctionDeclarations(root: Node): OxcFunction[] {
  const declarations: OxcFunction[] = [];

  walk(root, {
    enter(node) {
      if (node.type === 'FunctionDeclaration') declarations.push(node);
    },
  });

  return declarations;
}

/** Find the first JSX element with the given dotted element name. */
export function findJsxElement(root: Node, name: string): JSXElement | undefined {
  let found: JSXElement | undefined;

  walk(root, {
    enter(node) {
      if (found || node.type !== 'JSXElement') return;

      if (jsxNamePath(node.openingElement.name).join('.') !== name) return;

      found = node;
      this.skip();
    },
  });

  return found;
}

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
