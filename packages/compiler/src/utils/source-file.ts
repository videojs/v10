import ts from 'typescript';

export function insertStatementsAfterImports(
  sourceFile: ts.SourceFile,
  statements: readonly ts.Statement[],
  factory: ts.NodeFactory
): ts.SourceFile {
  if (statements.length === 0) return sourceFile;

  let insertIndex = 0;
  for (let index = 0; index < sourceFile.statements.length; index++) {
    if (ts.isImportDeclaration(sourceFile.statements[index]!)) insertIndex = index + 1;
  }

  return factory.updateSourceFile(sourceFile, [
    ...sourceFile.statements.slice(0, insertIndex),
    ...statements,
    ...sourceFile.statements.slice(insertIndex),
  ]);
}
