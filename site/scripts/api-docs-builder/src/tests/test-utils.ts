import * as ts from 'typescript';

/** Only suitable for AST-walking tests — no type resolution. */
export function createTestProgram(code: string, fileName = 'test.ts'): ts.Program {
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const compilerHost = ts.createCompilerHost({});
  const originalGetSourceFile = compilerHost.getSourceFile;
  compilerHost.getSourceFile = (name, ...args) => {
    return name === fileName ? sourceFile : originalGetSourceFile.call(compilerHost, name, ...args);
  };
  compilerHost.fileExists = (name) => name === fileName;
  return ts.createProgram([fileName], {}, compilerHost);
}
