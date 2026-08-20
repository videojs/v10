import ts from 'typescript';

import type { GeneratedModule } from '../generate';

/** Emit one generated module declaration entirely in memory. */
export function createGeneratedModuleDeclaration(module: GeneratedModule, fileName: string): string {
  const code = module.code;
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    exactOptionalPropertyTypes: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    verbatimModuleSyntax: true,
  };
  const host = ts.createCompilerHost(compilerOptions);
  const getSourceFile = host.getSourceFile.bind(host);
  let outputText = '';

  host.fileExists = (path) => path === fileName || ts.sys.fileExists(path);
  host.readFile = (path) => (path === fileName ? code : ts.sys.readFile(path));
  host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) =>
    path === fileName
      ? ts.createSourceFile(path, code, languageVersion, true)
      : getSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile);
  host.writeFile = (_path, content) => {
    outputText = content;
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  const emitted = program.emit(undefined, host.writeFile, undefined, true);
  const errors = [...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics].filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );

  if (errors.length > 0) {
    throw new Error(
      `Could not emit generated declaration for ${fileName}:\n${ts.formatDiagnostics(errors, {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => '\n',
      })}`
    );
  }

  return outputText;
}
