import ts from 'typescript';
import type { CompilerDiagnostic } from './config';

export interface ParseOptions {
  filename?: string | undefined;
}

export interface ParseResult {
  ast: ts.SourceFile;
  diagnostics: readonly CompilerDiagnostic[];
}

/**
 * Parse constrained-JSX source into a TypeScript SourceFile.
 *
 * The parser is intentionally thin — `ts.createSourceFile` configured for TSX
 * with parent pointers set so transforms can walk back up the tree.
 */
export function parse(source: string, options: ParseOptions = {}): ParseResult {
  const filename = options.filename ?? 'input.tsx';

  const ast = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX
  );

  return { ast, diagnostics: syntacticDiagnostics(ast) };
}

function syntacticDiagnostics(ast: ts.SourceFile): CompilerDiagnostic[] {
  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.Preserve,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const host = ts.createCompilerHost(options, true);
  const originalGetSourceFile = host.getSourceFile;

  host.fileExists = (fileName) => fileName === ast.fileName;
  host.readFile = (fileName) => (fileName === ast.fileName ? ast.text : undefined);
  host.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) =>
    fileName === ast.fileName
      ? ast
      : originalGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);

  const program = ts.createProgram([ast.fileName], options, host);
  return program.getSyntacticDiagnostics(ast).map(diagnosticFromTypescript);
}

function diagnosticFromTypescript(diagnostic: ts.DiagnosticWithLocation): CompilerDiagnostic {
  const start = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const end = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start + diagnostic.length);
  return {
    level: 'error',
    code: `TS${diagnostic.code}`,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    file: diagnostic.file.fileName,
    line: start.line + 1,
    column: start.character + 1,
    endLine: end.line + 1,
    endColumn: end.character + 1,
    sourceText: diagnostic.file.text,
    plugin: 'typescript',
  };
}
