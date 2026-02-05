import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import { formatProperties } from './formatter.js';
import type { CoreExtraction, ExtractedProp } from './types.js';

/**
 * Extract Props, State, and defaultProps from a core component file.
 *
 * Looks for patterns like:
 * - interface PlayButtonProps { ... }
 * - interface PlayButtonState { ... }
 * - class PlayButtonCore { static defaultProps = { ... } }
 */
export function extractCore(filePath: string, program: ts.Program, componentName: string): CoreExtraction | null {
  const ast = tae.parseFromProgram(filePath, program);

  // Find the Props interface (e.g., PlayButtonProps)
  const propsExport = ast.exports.find((exp) => exp.name === `${componentName}Props`);

  // Find the State interface (e.g., PlayButtonState)
  const stateExport = ast.exports.find((exp) => exp.name === `${componentName}State`);

  if (!propsExport && !stateExport) {
    return null;
  }

  // Extract props
  let props: ExtractedProp[] = [];
  let description: string | undefined;

  if (propsExport?.type instanceof tae.ObjectNode) {
    const formatted = formatProperties(propsExport.type.properties);
    props = Object.entries(formatted).map(([name, def]) => ({
      name,
      ...def,
    }));
    description = propsExport.documentation?.description;
  }

  // Extract state
  let state: ExtractedProp[] = [];
  if (stateExport?.type instanceof tae.ObjectNode) {
    const formatted = formatProperties(stateExport.type.properties);
    state = Object.entries(formatted).map(([name, def]) => ({
      name,
      ...def,
    }));
  }

  // Extract defaultProps from the Core class
  const defaultProps = extractDefaultProps(filePath, program, componentName);

  return {
    description,
    props,
    state,
    defaultProps,
  };
}

/**
 * Extract defaultProps from the Core class static property.
 *
 * Looks for: static readonly defaultProps = { label: '', disabled: false }
 */
export function extractDefaultProps(
  filePath: string,
  program: ts.Program,
  componentName: string
): Record<string, string> {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return {};

  const defaultProps: Record<string, string> = {};

  function visit(node: ts.Node) {
    // Look for class declaration
    if (ts.isClassDeclaration(node) && node.name?.text === `${componentName}Core`) {
      for (const member of node.members) {
        // Look for static property named defaultProps
        if (
          ts.isPropertyDeclaration(member) &&
          member.name &&
          ts.isIdentifier(member.name) &&
          member.name.text === 'defaultProps' &&
          member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
          member.initializer
        ) {
          // Parse the object literal
          if (ts.isObjectLiteralExpression(member.initializer)) {
            for (const prop of member.initializer.properties) {
              if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                const propName = prop.name.text;
                const propValue = getPropertyValue(prop.initializer, sourceFile);
                if (propValue !== undefined) {
                  defaultProps[propName] = propValue;
                }
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return defaultProps;
}

/**
 * Get a string representation of a property value.
 */
export function getPropertyValue(node: ts.Expression, sourceFile: ts.SourceFile): string | undefined {
  if (ts.isStringLiteral(node)) {
    return `'${node.text}'`;
  }

  if (ts.isNumericLiteral(node)) {
    return node.text;
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return 'true';
  }

  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return 'false';
  }

  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return 'null';
  }

  if (ts.isArrayLiteralExpression(node) && node.elements.length === 0) {
    return '[]';
  }

  if (ts.isObjectLiteralExpression(node) && node.properties.length === 0) {
    return '{}';
  }

  // For more complex expressions, get the source text
  return node.getText(sourceFile);
}
