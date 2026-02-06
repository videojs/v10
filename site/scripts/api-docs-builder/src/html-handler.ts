import * as ts from 'typescript';
import type { HtmlExtraction } from './types.js';

/** Extract tagName from a Lit element file. */
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

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
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

  return tagName ? { tagName } : null;
}
