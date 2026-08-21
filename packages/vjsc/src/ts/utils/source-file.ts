import ts from 'typescript';
import { sourceScriptKind } from './source-module';

/** Parse a TypeScript-family source file using the syntax implied by its filename. */
export function parseSourceFile(source: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, sourceScriptKind(fileName));
}

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
