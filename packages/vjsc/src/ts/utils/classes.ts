import ts from 'typescript';

export function collectClassDeclarations(sourceFile: ts.SourceFile): ts.ClassDeclaration[] {
  return sourceFile.statements.filter(ts.isClassDeclaration);
}

export function findClassDeclaration(sourceFile: ts.SourceFile, name: string): ts.ClassDeclaration | undefined {
  return collectClassDeclarations(sourceFile).find((declaration) => declaration.name?.text === name);
}

export function readStaticStringProperty(declaration: ts.ClassLikeDeclaration, name: string): string | undefined {
  for (const member of declaration.members) {
    if (!ts.isPropertyDeclaration(member) || !hasStaticModifier(member)) continue;
    if (!ts.isIdentifier(member.name) || member.name.text !== name) continue;
    if (member.initializer && ts.isStringLiteralLike(member.initializer)) return member.initializer.text;
  }

  return undefined;
}

function hasStaticModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) === true
  );
}
