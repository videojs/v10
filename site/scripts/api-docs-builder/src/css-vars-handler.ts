import * as ts from 'typescript';
import { getJsDocComment } from './data-attrs-handler.js';
import type { CSSVarsExtraction } from './types.js';

function unwrapObjectLiteral(node: ts.Expression): ts.ObjectLiteralExpression | undefined {
  if (ts.isObjectLiteralExpression(node)) {
    return node;
  }

  if (ts.isParenthesizedExpression(node)) {
    return unwrapObjectLiteral(node.expression);
  }

  if (ts.isAsExpression(node)) {
    return unwrapObjectLiteral(node.expression);
  }

  if (ts.isSatisfiesExpression(node)) {
    return unwrapObjectLiteral(node.expression);
  }

  return undefined;
}

/**
 * Extract CSS custom properties from a css-vars file.
 *
 * Looks for patterns like:
 * ```ts
 * export const SliderCSSVars = {
 *   /** Fill level percentage (0–100). *\/
 *   fill: '--media-slider-fill',
 * } as const;
 * ```
 */
export function extractCSSVars(filePath: string, program: ts.Program, componentName: string): CSSVarsExtraction | null {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    return null;
  }

  const vars: Array<{ name: string; description: string }> = [];
  const expectedName = `${componentName}CSSVars`;

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || decl.name.text !== expectedName || !decl.initializer) {
          continue;
        }

        const objLiteral = unwrapObjectLiteral(decl.initializer);
        if (!objLiteral) continue;

        for (const prop of objLiteral.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            let cssVarName = '';

            if (ts.isStringLiteral(prop.initializer)) {
              cssVarName = prop.initializer.text;
            }

            const description = getJsDocComment(prop, sourceFile);

            if (cssVarName) {
              vars.push({
                name: cssVarName,
                description: description || '',
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (vars.length === 0) {
    return null;
  }

  return { vars };
}
