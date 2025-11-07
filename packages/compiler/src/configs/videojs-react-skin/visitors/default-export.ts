/**
 * ExtractDefaultExport Visitor
 *
 * Phase 1: Identification
 * Extracts component name and root JSX element from default export
 * No categorization - just identification
 */

import type { NodePath } from '@babel/traverse';
import type * as BabelTypes from '@babel/types';
import type { AnalysisVisitors } from '../../../phases/types';
import type { DefaultExportUsage } from '../../types';
import * as t from '@babel/types';

const defaultExportVisitor: AnalysisVisitors = {
  ExportDefaultDeclaration: (
    prevExport: DefaultExportUsage | undefined,
    path: NodePath<BabelTypes.ExportDefaultDeclaration>,
  ): DefaultExportUsage | undefined => {
    const declaration = path.node.declaration;

    let componentName = 'UnknownComponent';
    let jsxElement: NodePath<BabelTypes.JSXElement> | null = null;

    // Extract component name and JSX based on declaration type
    if (t.isFunctionDeclaration(declaration) && declaration.id) {
      // export default function Foo() { }
      componentName = declaration.id.name;
      jsxElement = findJSXReturnPath(path.get('declaration.body') as NodePath<BabelTypes.BlockStatement>, t);
    } else if (t.isArrowFunctionExpression(declaration) || t.isFunctionExpression(declaration)) {
      // export default () => { } or export default function() { }

      // Try to find name from variable declarator
      const parentPath = path.parentPath;
      if (parentPath && parentPath.isVariableDeclarator()) {
        const id = parentPath.node.id;
        if (t.isIdentifier(id)) {
          componentName = id.name;
        }
      }

      // Extract JSX from body
      if (t.isBlockStatement(declaration.body)) {
        const bodyPath = path.get('declaration.body') as NodePath<BabelTypes.BlockStatement>;
        jsxElement = findJSXReturnPath(bodyPath, t);
      } else if (t.isJSXElement(declaration.body)) {
        // Direct JSX return: () => <div />
        jsxElement = path.get('declaration.body') as NodePath<BabelTypes.JSXElement>;
      }
    }

    if (!jsxElement) {
      return prevExport;
    }

    const defaultExport: DefaultExportUsage = {
      componentName,
      node: path as any,
      jsxElement: jsxElement as any,
    };

    return defaultExport;
  },
};

export default defaultExportVisitor;

/**
 * Find JSX element in return statement
 * Returns NodePath to JSX element, not the element itself
 */
function findJSXReturnPath(
  bodyPath: NodePath<BabelTypes.BlockStatement>,
  _t: typeof BabelTypes,
): NodePath<BabelTypes.JSXElement> | null {
  const statements = bodyPath.get('body');

  for (const statement of statements) {
    if (statement.isReturnStatement()) {
      const argument = statement.get('argument');
      if (Array.isArray(argument)) continue;

      if (argument.isJSXElement()) {
        return argument;
      }
    }
  }

  return null;
}
