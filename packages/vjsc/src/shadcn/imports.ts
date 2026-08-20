import ts from 'typescript';

import { sourceScriptKind } from '../utils/source-module';

export interface ImportReference {
  readonly specifier: string;
  readonly start: number;
  readonly end: number;
  readonly quote: string;
}

/** Locate editable ESM import specifiers without changing source formatting. */
export function collectImportReferences(source: string, fileName: string): ImportReference[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, sourceScriptKind(fileName));
  const references: ImportReference[] = [];
  const visit = (node: ts.Node): void => {
    const literal = moduleSpecifier(node);
    if (literal) {
      const start = literal.getStart(sourceFile);
      references.push({
        specifier: literal.text,
        start,
        end: literal.getEnd(),
        quote: source[start] === '`' ? '`' : source[start] === '"' ? '"' : "'",
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
}

function moduleSpecifier(node: ts.Node): ts.StringLiteralLike | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier : undefined;
  }
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0]!)
  ) {
    return node.arguments[0];
  }
  return undefined;
}
