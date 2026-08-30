import type { ModuleMeta } from '../components/meta';
import type { ImportReference } from '../shadcn/analyze';

export interface GraphImport extends ImportReference {
  readonly resolvedId?: string | undefined;
}

export interface GraphModuleStyles {
  /** Authored style output files referenced by this module. */
  readonly files: readonly string[];
  /** Captured generated style assets referenced by this module. */
  readonly assets: readonly string[];
}

export interface GraphModule<Meta extends ModuleMeta = ModuleMeta> {
  /** Full host module ID, including its VJSC transform query. */
  readonly id: string;
  /** Absolute physical source filename. */
  readonly filename: string;
  /** Physical source path relative to the graph root. */
  readonly sourcePath: string;
  /** VJSC entry parameters used to produce this module. */
  readonly params: Readonly<Record<string, string>>;
  /** Final transformed source captured after the VJSC pipeline. */
  readonly source: string;
  readonly imports: readonly GraphImport[];
  readonly styles: GraphModuleStyles;
  readonly meta?: Meta | undefined;
}

/** Finalized transformed-module graph exposed by `vjscPlugin`. */
export interface VjscGraph<Meta extends ModuleMeta = ModuleMeta> {
  readonly root: string;
  readonly modules: ReadonlyMap<string, GraphModule<Meta>>;
  readonly assets: ReadonlyMap<string, string>;
}
