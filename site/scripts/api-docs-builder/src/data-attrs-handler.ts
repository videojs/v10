import * as ts from 'typescript';
import type { DataAttrsExtraction } from './types.js';

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
 * Extract data attributes from a data-attrs file.
 *
 * Looks for patterns like:
 * ```ts
 * export const PlayButtonDataAttrs = {
 *   /** Present when the media is paused. *\/
 *   paused: 'data-paused',
 *   /** Present when the media has ended. *\/
 *   ended: 'data-ended',
 * } as const;
 * ```
 */
export function extractDataAttrs(
  filePath: string,
  program: ts.Program,
  componentName: string
): DataAttrsExtraction | null {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    return null;
  }

  const attrs: Array<{ name: string; description: string }> = [];

  // Common naming patterns for data attributes exports
  const possibleNames = [`${componentName}DataAttrs`, `${componentName}DataAttributes`];

  function visit(node: ts.Node) {
    // Look for variable declaration like: export const PlayButtonDataAttrs = { ... }
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !possibleNames.includes(decl.name.text) || !decl.initializer) {
          continue;
        }

        const objLiteral = unwrapObjectLiteral(decl.initializer);
        if (!objLiteral) continue;

        // Extract properties with their JSDoc comments
        for (const prop of objLiteral.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const propName = prop.name.text;
            let dataAttrValue = '';

            // Get the value (e.g., 'data-paused')
            if (ts.isStringLiteral(prop.initializer)) {
              dataAttrValue = prop.initializer.text;
            }

            // Get JSDoc comment for this property
            const jsDocComment = getJsDocComment(prop, sourceFile);

            attrs.push({
              name: dataAttrValue || `data-${propName}`,
              description: jsDocComment || '',
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (attrs.length === 0) {
    return null;
  }

  return { attrs };
}

/**
 * Extract JSDoc comment from a property assignment.
 */
export function getJsDocComment(node: ts.PropertyAssignment, sourceFile: ts.SourceFile): string {
  // Get leading comment ranges
  const fullText = sourceFile.getFullText();
  const nodeStart = node.getFullStart();
  const ranges = ts.getLeadingCommentRanges(fullText, nodeStart);

  if (!ranges || ranges.length === 0) return '';

  // Get the last comment (closest to the property)
  const lastRange = ranges[ranges.length - 1];
  if (!lastRange) return '';

  const commentText = fullText.substring(lastRange.pos, lastRange.end);

  // Parse JSDoc comment
  if (commentText.startsWith('/**')) {
    return commentText
      .replace(/^\/\*\*\s*/, '')
      .replace(/\s*\*\/$/, '')
      .replace(/^\s*\*\s?/gm, '')
      .trim();
  }

  // Single-line comment
  if (commentText.startsWith('//')) {
    return commentText.replace(/^\/\/\s*/, '').trim();
  }

  return '';
}
