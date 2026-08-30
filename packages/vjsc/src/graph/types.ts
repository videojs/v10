import type { NamedModuleMeta } from '../components/meta';
import type { ImportReference } from '../shadcn/analyze';

export interface ComponentGraphImport extends ImportReference {
  readonly resolvedId?: string | undefined;
}

export interface ComponentGraphModule<Item extends NamedModuleMeta = NamedModuleMeta> {
  /** Full host module ID, including its VJSC transform query. */
  readonly id: string;
  /** Absolute physical source filename. */
  readonly filename: string;
  /** VJSC transform selection used to produce this module. */
  readonly transform: Readonly<Record<string, string>>;
  /** Final transformed source captured after the VJSC pipeline. */
  readonly source: string;
  readonly imports: readonly ComponentGraphImport[];
  readonly meta?: Item | undefined;
}

export interface ComponentGraph<Item extends NamedModuleMeta = NamedModuleMeta> {
  readonly root: string;
  readonly modules: ReadonlyMap<string, ComponentGraphModule<Item>>;
  readonly assets: ReadonlyMap<string, string>;
  readonly styles: ReadonlyMap<string, readonly string[]>;
}

export interface ComponentGraphInput {
  readonly id: string;
  readonly filename: string;
  readonly transform: Readonly<Record<string, string>>;
}

export interface ComponentGraphPluginApi<Item extends NamedModuleMeta = NamedModuleMeta> {
  /** Read the graph after Rolldown has completed its transform pipeline. */
  getGraph(): ComponentGraph<Item>;
}

/** Plugin-like graph owner passed explicitly to downstream build adapters. */
export interface ComponentGraphProvider<Item extends NamedModuleMeta = NamedModuleMeta> {
  readonly api?: ComponentGraphPluginApi<Item> | undefined;
}

export interface ComponentGraphPluginOptions {
  readonly root: string;
  readonly include: string | readonly string[];
  readonly exclude?: string | readonly string[] | undefined;
  /** Select the isolated VJSC transform combinations captured for each physical module. */
  readonly transformations?:
    | ((
        module: ComponentGraphInput,
        modules: readonly ComponentGraphInput[]
      ) => readonly Readonly<Record<string, string>>[])
    | undefined;
}
