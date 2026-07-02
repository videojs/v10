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

function extractSatisfiesExpression(node: ts.Expression): ts.TypeNode | undefined {
  if (ts.isSatisfiesExpression(node)) return node.type;
  if (ts.isParenthesizedExpression(node)) return extractSatisfiesExpression(node.expression);
  if (ts.isAsExpression(node)) return extractSatisfiesExpression(node.expression);
  return undefined;
}

function inferStateTypes(satisfiesType: ts.TypeNode, program: ts.Program): Map<string, string> | undefined {
  if (!ts.isTypeReferenceNode(satisfiesType) || !satisfiesType.typeArguments?.length) {
    return undefined;
  }

  const stateTypeArg = satisfiesType.typeArguments[0]!;
  const checker = program.getTypeChecker();
  const resolvedType = checker.getTypeAtLocation(stateTypeArg);
  const properties = resolvedType.getProperties();

  if (properties.length === 0) return undefined;

  const result = new Map<string, string>();

  for (const prop of properties) {
    const propType = checker.getTypeOfSymbol(prop);

    // Expand union types to avoid showing alias names (e.g., VolumeLevel → 'off' | 'low')
    let typeStr: string;
    if (propType.isUnion()) {
      typeStr = propType.types.map((t) => checker.typeToString(t)).join(' | ');
    } else {
      typeStr = checker.typeToString(propType);
    }

    if (typeStr === 'boolean' || typeStr === 'false | true') continue;
    result.set(prop.name, typeStr.replace(/"/g, "'"));
  }

  return result;
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

  const visit = (node: ts.Node) => {
    // Look for variable declaration like: export const PlayButtonDataAttrs = { ... }
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !possibleNames.includes(decl.name.text) || !decl.initializer) {
          continue;
        }

        const objLiteral = unwrapObjectLiteral(decl.initializer);
        if (!objLiteral) continue;

        // Infer types from satisfies StateAttrMap<State>
        const satisfiesType = extractSatisfiesExpression(decl.initializer);
        const stateTypes = satisfiesType ? inferStateTypes(satisfiesType, program) : undefined;

        // Extract properties with their JSDoc comments
        for (const prop of objLiteral.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const propName = prop.name.text;
            let dataAttrValue = '';

            // Get the value (e.g., 'data-paused')
            if (ts.isStringLiteral(prop.initializer)) {
              dataAttrValue = prop.initializer.text;
            }

            // Get JSDoc comment and optional @type for this property
            const { description: jsDocComment, type: jsDocType } = parseJsDoc(prop, sourceFile);

            const attrEntry: { name: string; description: string; type?: string } = {
              name: dataAttrValue || `data-${propName}`,
              description: jsDocComment || '',
            };

            // JSDoc @type takes priority, then inferred type from satisfies
            if (jsDocType) {
              attrEntry.type = jsDocType;
            } else if (stateTypes?.has(propName)) {
              attrEntry.type = stateTypes.get(propName)!;
            }

            attrs.push(attrEntry);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (attrs.length === 0) {
    return null;
  }

  return { attrs };
}

/**
 * Parse JSDoc comment, extracting description and optional `@type` tag.
 */
export function parseJsDoc(
  node: ts.PropertyAssignment,
  sourceFile: ts.SourceFile
): { description: string; type?: string } {
  const raw = getJsDocComment(node, sourceFile);
  if (!raw) return { description: '' };

  // Extract @type {value} tag
  const typeMatch = raw.match(/@type\s*\{([^}]+)\}/);
  if (!typeMatch) return { description: raw };

  const type = typeMatch[1]!.trim();
  // Remove the @type line from description
  const description = raw.replace(/@type\s*\{[^}]+\}/, '').trim();

  return { description, type };
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
