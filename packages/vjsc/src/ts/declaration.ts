import ts from 'typescript';

/** Generate an isolated declaration module from TypeScript source. */
export function createDeclaration(source: string, fileName: string): string {
  const result = ts.transpileDeclaration(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
    reportDiagnostics: true,
  });
  const errors = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

  if (errors?.length) {
    throw new Error(
      `Could not generate a declaration for ${fileName}:\n${ts.formatDiagnostics(errors, {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => '\n',
      })}`
    );
  }

  return result.outputText;
}
