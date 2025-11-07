/**
 * ExtractJSXUsage Visitor
 *
 * Phase 1: Identification
 * Builds tree structure of JSX elements with recursive children
 * Extracts basic attributes (string literals, booleans, member expressions)
 */

import type { NodePath } from '@babel/traverse';
import type * as BabelTypes from '@babel/types';
import type { AnalysisVisitors } from '../../../phases/types';
import type { JSXAttributeValue, JSXUsage } from '../../types';
import { CLASSNAME_TRACKED_SEPARATELY } from '../../types';

/**
 * Find parent JSX element in AST
 */
function findParentJSXElement(
  path: NodePath<BabelTypes.JSXElement>,
): NodePath<BabelTypes.JSXElement> | undefined {
  let current: NodePath | null = path.parentPath;

  while (current) {
    if (current.isJSXElement()) {
      return current as NodePath<BabelTypes.JSXElement>;
    }
    current = current.parentPath;
  }

  return undefined;
}

/**
 * Extract identifier and member from JSX element
 */
function extractJSXName(name: BabelTypes.JSXElement['openingElement']['name']): {
  identifier: string;
  member?: string;
} | undefined {
  if (name.type === 'JSXIdentifier') {
    return { identifier: name.name };
  }

  if (name.type === 'JSXMemberExpression') {
    // Extract base identifier
    let obj = name.object;
    while (obj.type === 'JSXMemberExpression') {
      obj = obj.object;
    }
    const identifier = obj.type === 'JSXIdentifier' ? obj.name : '';

    // Extract member
    const member = name.property.type === 'JSXIdentifier' ? name.property.name : undefined;

    if (!identifier) return undefined;

    // Handle exactOptionalPropertyTypes - don't include member if undefined
    return member !== undefined ? { identifier, member } : { identifier };
  }

  return undefined;
}

/**
 * Extract single JSX attribute value
 * Extracts simple primitive values from JSX attributes
 *
 * Supported:
 * - String literals: prop="hello" → 'hello'
 * - Booleans: disabled → true
 * - Simple expressions: prop={true}, prop={42}, prop={"string"}
 *
 * Unsupported (returns null to skip):
 * - Member expressions (except className which uses symbol)
 * - Complex expressions
 * - Arrays
 */
function extractAttributeValue(
  value: BabelTypes.JSXAttribute['value'],
): JSXAttributeValue | null {
  // Boolean attribute (e.g., disabled)
  if (!value) {
    return true;
  }

  // String literal: prop="hello"
  if (value.type === 'StringLiteral') {
    return value.value;
  }

  // JSX expression: prop={...}
  if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression;

    // Simple primitives
    if (expr.type === 'StringLiteral') {
      return expr.value;
    }
    if (expr.type === 'NumericLiteral') {
      return expr.value;
    }
    if (expr.type === 'BooleanLiteral') {
      return expr.value;
    }

    // Unsupported: member expressions, complex expressions, etc.
    // These should be handled by specific concerns or categorization
    return null;
  }

  // Other types unsupported
  return null;
}

/**
 * Extract all attributes from JSX element
 * className is marked with CLASSNAME_TRACKED_SEPARATELY symbol
 * Other attributes extracted as simple primitives
 */
function extractAttributes(
  node: BabelTypes.JSXElement,
): Record<string, JSXAttributeValue> {
  const attributes: Record<string, JSXAttributeValue> = {};

  for (const attr of node.openingElement.attributes) {
    if (attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier') {
      const name = attr.name.name;

      // Special case: className tracked separately in ClassNameUsage
      if (name === 'className') {
        attributes[name] = CLASSNAME_TRACKED_SEPARATELY;
        continue;
      }

      // Extract other attributes
      const value = extractAttributeValue(attr.value);

      // Skip unsupported attributes (member expressions, complex expressions)
      if (value !== null) {
        attributes[name] = value;
      }
    }
    // Skip JSXSpreadAttribute for now
  }

  return attributes;
}

/**
 * Recursively extract JSX element and all its children
 * Builds complete subtree with elements, text, and expressions
 */
function extractJSXElement(
  path: NodePath<BabelTypes.JSXElement>,
): JSXUsage | undefined {
  const openingElement = path.node.openingElement;
  const elementName = extractJSXName(openingElement.name);

  if (!elementName) return undefined;

  const { identifier, member } = elementName;

  // Extract attributes
  const attributes = extractAttributes(path.node);

  // Extract all children (text, expressions, elements)
  const children: JSXUsage[] = [];

  for (const child of path.node.children) {
    if (child.type === 'JSXText') {
      // Extract text content
      const text = child.value.trim();
      if (text) {
        children.push({
          type: 'text',
          value: text,
        });
      }
    } else if (child.type === 'JSXExpressionContainer') {
      // Extract expression container
      const expr = child.expression;
      if (expr.type === 'JSXEmptyExpression') {
        // Skip empty expressions
        continue;
      }

      if (expr.type === 'Identifier') {
        children.push({
          type: 'expression',
          expressionType: 'identifier',
          identifierName: expr.name,
        });
      } else if (expr.type === 'MemberExpression') {
        children.push({
          type: 'expression',
          expressionType: 'member',
        });
      } else {
        children.push({
          type: 'expression',
          expressionType: 'other',
        });
      }
    } else if (child.type === 'JSXElement') {
      // Recursively extract child element
      const childPath = path.get(`children.${path.node.children.indexOf(child)}`) as NodePath<BabelTypes.JSXElement>;
      const childElement = extractJSXElement(childPath);
      if (childElement) {
        children.push(childElement);
      }
    }
    // Skip JSXFragment and JSXSpreadChild for now
  }

  // Create JSX element with all children
  const newElement: JSXUsage = {
    type: 'element',
    identifier,
    ...(member !== undefined && { member }),
    node: path as any,
    children: children as any, // Mixed array of text/expression/element nodes
    attributes,
  };

  return newElement;
}

const jsxVisitor: AnalysisVisitors = {
  JSXElement: (
    prevJsx: JSXUsage | undefined,
    path: NodePath<BabelTypes.JSXElement>,
  ): JSXUsage | undefined => {
    // Only process root elements (elements without a JSX parent)
    const parentPath = findParentJSXElement(path);

    if (parentPath) {
      // This is a child element, skip (will be processed by parent)
      return prevJsx;
    }

    // Root element: recursively extract tree
    const jsxTree = extractJSXElement(path);

    if (!jsxTree) return prevJsx;

    return jsxTree;
  },
};

export default jsxVisitor;
