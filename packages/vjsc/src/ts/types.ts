import type ts from 'typescript';

export type CompilerTransform = ts.TransformerFactory<ts.SourceFile>;

export interface CompilerAsset {
  type: 'css';
  fileName: string;
  source: string;
}

export interface CompilerDiagnostic {
  level: 'warning' | 'error';
  code: string;
  message: string;
  file?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  endLine?: number | undefined;
  endColumn?: number | undefined;
  sourceText?: string | undefined;
  plugin?: string | undefined;
}

export interface CompilerSourceMap {
  version: 3;
  file: string | null;
  sourceRoot?: string;
  sources: Array<string | null>;
  sourcesContent?: Array<string | null | undefined>;
  names: string[];
  mappings: string;
}

/** A source module at its current point in the compiler pipeline. */
export interface CompilerModule {
  /** Authored source passed to the compiler. */
  readonly code: string;
  /** Full module ID, including any transform-selection query. */
  readonly id: string;
  /** Current AST after every preceding compiler plugin. */
  readonly sourceFile: ts.SourceFile;
}

export interface CompilerSetupContext {
  /** Directory used to resolve compiler configuration. */
  readonly cwd: string;
  /** Register a configuration input that should invalidate host watch builds. */
  addWatchFile(fileName: string): void;
}

export interface CompilerTransformContext extends CompilerSetupContext {
  readonly outputFile?: string | undefined;
  /** Metadata retained with the transformed module by host adapters. */
  readonly meta: Record<string, unknown>;
  /** Apply a synchronous TypeScript transformer while retaining compiler lifecycle ownership. */
  apply(sourceFile: ts.SourceFile, transform: CompilerTransform): ts.SourceFile;
  /** Prepend generated source without forcing the authored module through the TypeScript printer. */
  prepend(code: string): void;
  addAsset(asset: CompilerAsset): void;
  addWatchFile(fileName: string): void;
  report(diagnostic: CompilerDiagnostic): void;
}

export interface CompilerPlugin {
  readonly name: string;
  /** Initialize this plugin once for a compiler instance. */
  setup?(context: CompilerSetupContext): void | Promise<void>;
  /** Transform one module, or return null to leave it unchanged. */
  transform?(
    module: CompilerModule,
    context: CompilerTransformContext
  ): ts.SourceFile | null | Promise<ts.SourceFile | null>;
}

export interface CompilerOptions {
  /** Directory used to resolve compiler configuration. */
  readonly cwd?: string | undefined;
  readonly plugins?: readonly CompilerPlugin[] | undefined;
}
