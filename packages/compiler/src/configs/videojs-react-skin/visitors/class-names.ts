/**
 * ExtractClassNameUsage Visitor
 *
 * Phase 1: Identification
 * Extracts style object member access in className attributes
 * Captures: style identifier, key, and className attribute node
 */

import type { NodePath } from '@babel/traverse';
import type * as BabelTypes from '@babel/types';
import type { AnalysisVisitors } from '../../../phases/types';
import type { ClassNameUsage } from '../../types';
import * as t from '@babel/types';

const classNamesVisitor: AnalysisVisitors = {
  JSXAttribute: (
    prevClassNames: ClassNameUsage[] = [],
    path: NodePath<BabelTypes.JSXAttribute>,
  ): ClassNameUsage[] => {
    // Only process className attributes
    if (!t.isJSXIdentifier(path.node.name) || path.node.name.name !== 'className') {
      return prevClassNames;
    }

    const value = path.node.value;
    if (!value) return prevClassNames;

    // Find parent JSX element to get component info
    let jsxElement: NodePath | null = path.parentPath;
    while (jsxElement && !jsxElement.isJSXOpeningElement()) {
      jsxElement = jsxElement.parentPath;
    }

    if (!jsxElement || !jsxElement.isJSXOpeningElement()) {
      return prevClassNames; // Can't find parent JSX element
    }

    const elementName = jsxElement.node.name;
    let componentIdentifier: string;
    let componentMember: string | undefined;

    if (elementName.type === 'JSXIdentifier') {
      componentIdentifier = elementName.name;
    } else if (elementName.type === 'JSXMemberExpression') {
      // Compound component
      let obj = elementName.object;
      while (obj.type === 'JSXMemberExpression') {
        obj = obj.object;
      }
      componentIdentifier = obj.type === 'JSXIdentifier' ? obj.name : '';
      componentMember = elementName.property.type === 'JSXIdentifier' ? elementName.property.name : undefined;
    } else {
      return prevClassNames;
    }

    // Extract className usages from value
    // Note: Order between member expressions and string literals is not preserved.
    // For mixed values like `${styles.A} foo ${styles.B} bar`, we'll produce:
    // - Two member expression entries (A, B) in source order
    // - One string literal entry with classes: ['foo', 'bar'] in source order
    // The relative ordering BETWEEN these types is lost, but this is acceptable
    // since CSS specificity is determined by stylesheet order, not class attribute order.
    const usages: ClassNameUsage[] = [];
    const literalClasses: string[] = [];

    // Build base component reference
    const componentRef = componentMember !== undefined
      ? {
          identifier: componentIdentifier,
          member: componentMember,
          node: jsxElement as any,
        }
      : {
          identifier: componentIdentifier,
          node: jsxElement as any,
        };

    // Helper to extract member expressions and string literals
    const extractClassNames = (node: BabelTypes.Node) => {
      if (t.isMemberExpression(node)) {
        // Member expression: styles.Button
        if (t.isIdentifier(node.object) && t.isIdentifier(node.property)) {
          usages.push({
            type: 'member-expression',
            identifier: node.object.name,
            key: node.property.name,
            node: path as any,
            component: componentRef,
          });
        }
      } else if (t.isStringLiteral(node)) {
        // String literal: "button primary"
        const classes = node.value.split(/\s+/).filter(Boolean);
        literalClasses.push(...classes);
      } else if (t.isTemplateLiteral(node)) {
        // Template literal: `${styles.Button} active ${styles.Play}`
        // Extract from expressions (member expressions)
        for (const expr of node.expressions) {
          extractClassNames(expr);
        }
        // Extract from string segments (quasis)
        for (const quasi of node.quasis) {
          const classes = quasi.value.raw.split(/\s+/).filter(Boolean);
          literalClasses.push(...classes);
        }
      } else if (t.isJSXExpressionContainer(node)) {
        // Expression container: className={...}
        extractClassNames(node.expression);
      }
    };

    extractClassNames(value);

    // Add clustered string literal entry if any literal classes found
    if (literalClasses.length > 0) {
      usages.push({
        type: 'string-literal',
        classes: literalClasses,
        literalValue: literalClasses.join(' '),
        node: path as any,
        component: componentRef,
      });
    }

    if (usages.length === 0) return prevClassNames;

    return [...prevClassNames, ...usages];
  },
};

export default classNamesVisitor;
