import ts from 'typescript';

export function getImportSource(declaration: ts.ImportDeclaration): string | undefined {
  return ts.isStringLiteral(declaration.moduleSpecifier) ? declaration.moduleSpecifier.text : undefined;
}

export function isImportDeclarationFrom(node: ts.Node, source: string): node is ts.ImportDeclaration {
  return ts.isImportDeclaration(node) && getImportSource(node) === source;
}
