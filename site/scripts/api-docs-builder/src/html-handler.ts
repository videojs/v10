import * as ts from 'typescript';
import type { HtmlExtraction } from './types.js';

/** Extract tagName and reactive properties from a Lit element file. */
export function extractHtml(
  filePath: string,
  program: ts.Program,
  componentName: string,
  elementName?: string
): HtmlExtraction | null {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return null;

  const className = elementName ?? `${componentName}Element`;
  let tagName = '';
  let elementClass: ts.ClassDeclaration | undefined;

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      elementClass = node;
      for (const member of node.members) {
        if (
          ts.isPropertyDeclaration(member) &&
          member.name &&
          ts.isIdentifier(member.name) &&
          member.name.text === 'tagName' &&
          member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
          member.initializer &&
          ts.isStringLiteral(member.initializer)
        ) {
          tagName = member.initializer.text;
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!tagName || !elementClass) return null;

  const checker = program.getTypeChecker();
  const properties = new Set<string>();
  const seen = new Set<ts.ClassDeclaration>();

  function collectProperties(classNode: ts.ClassDeclaration) {
    if (seen.has(classNode)) return;
    seen.add(classNode);

    const type = checker.getTypeAtLocation(classNode);
    for (const baseType of checker.getBaseTypes(type as ts.InterfaceType) ?? []) {
      const declaration = baseType.getSymbol()?.declarations?.find(ts.isClassDeclaration);
      if (declaration) collectProperties(declaration);
    }

    for (const member of classNode.members) {
      if (
        !ts.isPropertyDeclaration(member) ||
        !member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ||
        !member.name ||
        !ts.isIdentifier(member.name) ||
        member.name.text !== 'properties' ||
        !member.initializer
      ) {
        continue;
      }

      let initializer = member.initializer;
      while (
        ts.isSatisfiesExpression(initializer) ||
        ts.isAsExpression(initializer) ||
        ts.isParenthesizedExpression(initializer)
      ) {
        initializer = initializer.expression;
      }
      if (!ts.isObjectLiteralExpression(initializer)) continue;

      for (const property of initializer.properties) {
        if (!ts.isPropertyAssignment(property) || !property.name) continue;
        const name =
          ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : undefined;
        if (!name) continue;

        let declaration = property.initializer;
        while (
          ts.isSatisfiesExpression(declaration) ||
          ts.isAsExpression(declaration) ||
          ts.isParenthesizedExpression(declaration)
        ) {
          declaration = declaration.expression;
        }
        if (
          ts.isObjectLiteralExpression(declaration) &&
          declaration.properties.some(
            (entry) =>
              ts.isPropertyAssignment(entry) &&
              ts.isIdentifier(entry.name) &&
              entry.name.text === 'attribute' &&
              entry.initializer.kind === ts.SyntaxKind.FalseKeyword
          )
        ) {
          continue;
        }

        properties.add(name);
      }
    }
  }

  collectProperties(elementClass);

  return { tagName, properties: [...properties] };
}
