import { relative, resolve } from 'node:path';

import ts from 'typescript';

import type { GeneratedModule } from './generate';
import { syncGeneratedFiles } from './generate';
import { toPosixPath } from './utils/path';

export interface GeneratedTypeModule {
  /** Source-tree location whose relative imports the generated module uses. */
  readonly fileName: string;
  /** Declaration path relative to the hidden type workspace. */
  readonly outputPath?: string | undefined;
  readonly module: GeneratedModule;
}

export interface SyncGeneratedModuleTypesOptions {
  readonly rootDir: string;
  readonly modules: readonly GeneratedTypeModule[];
  readonly typesDir?: string | undefined;
  readonly check?: boolean | undefined;
}

/** Emit generated-module declarations into a hidden tree that mirrors their source locations. */
export async function syncGeneratedModuleTypes(options: SyncGeneratedModuleTypesOptions): Promise<void> {
  const rootDir = resolve(options.rootDir);
  const typesDir = options.typesDir ?? '.vjsc/types';
  const files = options.modules.map(({ fileName, outputPath, module }) => {
    const sourceFile = resolve(fileName);
    const sourcePath = relative(rootDir, sourceFile);

    if (sourcePath === '' || sourcePath === '..' || sourcePath.startsWith('../')) {
      throw new Error(`Generated type module must stay inside its root: ${sourceFile}`);
    }

    return {
      path: `${typesDir}/${outputPath ?? declarationPath(toPosixPath(sourcePath))}`,
      content: createGeneratedModuleDeclaration(module, sourceFile),
    };
  });

  await syncGeneratedFiles({
    rootDir,
    files,
    managedRoots: [typesDir],
    ...(options.check !== undefined ? { check: options.check } : {}),
  });
}

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

function declarationPath(sourcePath: string): string {
  return sourcePath.replace(/\.[cm]?[jt]sx?$/, '.d.ts');
}
