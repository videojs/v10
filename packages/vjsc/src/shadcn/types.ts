import type { RegistryItem } from 'shadcn/schema';

import type { ModuleMeta } from '../components/meta';
import type { GraphModule, VjscGraph } from '../graph';

type DistributiveOmit<Value, Key extends PropertyKey> = Value extends unknown ? Omit<Value, Key> : never;

export type RegistryModuleTarget<Meta extends ModuleMeta = ModuleMeta> =
  | string
  | ((module: GraphModule<Meta>, root: GraphModule<Meta>) => string);

export interface RegistryStylesheetOutput {
  /** Installed path of the stylesheet bundled from this item's module closure. */
  readonly target: string;
  /** Additional authored CSS files relative to the VJSC graph root. */
  readonly include?: readonly string[] | undefined;
}

/** Public Shadcn fields and installation policy for one transformed graph module. */
export type VjscRegistryResolvedItem<Meta extends ModuleMeta = ModuleMeta> = DistributiveOmit<RegistryItem, 'files'> & {
  /** Included registry path, such as `components` or `blocks`. */
  readonly group: string;
  /** Root-module target relative to the configured installation directory. */
  readonly target: RegistryModuleTarget<Meta>;
  /** Installed filename for the root module. Defaults to its source filename. */
  readonly filename?: string | undefined;
  /** Import replacements applied while packaging this item. */
  readonly imports?: Readonly<Record<string, string>> | undefined;
  /** Bundle the module closure's generated CSS into one installed stylesheet. */
  readonly stylesheet?: RegistryStylesheetOutput | undefined;
};

/** A file-backed Shadcn item which is not owned by one transformed graph module. */
export type VjscRegistryCreatedItem = RegistryItem & {
  /** Included registry path, such as `components` or `blocks`. */
  readonly group: string;
};

export interface VjscRegistryItemContext<Meta extends ModuleMeta = ModuleMeta> {
  readonly graph: VjscGraph<Meta>;
  readonly module: GraphModule<Meta>;
}

export interface VjscRegistryCreateContext<Meta extends ModuleMeta = ModuleMeta> {
  readonly graph: VjscGraph<Meta>;
}

export interface VjscRegistryItemsOptions<Meta extends ModuleMeta = ModuleMeta> {
  resolve(
    context: VjscRegistryItemContext<Meta>
  ): VjscRegistryResolvedItem<Meta> | null | Promise<VjscRegistryResolvedItem<Meta> | null>;
  create?(
    context: VjscRegistryCreateContext<Meta>
  ): readonly VjscRegistryCreatedItem[] | Promise<readonly VjscRegistryCreatedItem[]>;
}

export type VjscRegistryThemeOptions = DistributiveOmit<RegistryItem, 'files' | 'name' | 'type'> & {
  /** Installed path of the shared theme stylesheet. */
  readonly target: string;
  /** Authored CSS files relative to the VJSC graph root. */
  readonly include?: readonly string[] | undefined;
};

export interface VjscRegistryStylesOptions {
  readonly theme?: VjscRegistryThemeOptions | undefined;
  /** Compiled VJSC style file to stable installed stylesheet path. */
  readonly files?: Readonly<Record<string, string>> | undefined;
}

export interface VjscRegistryOptions<Meta extends ModuleMeta = ModuleMeta> {
  readonly name: string;
  readonly homepage: string;
  readonly namespace: string;
  readonly paths: {
    readonly install: string;
    readonly import: string;
  };
  /** Directory below the Rolldown output root where this catalog is emitted. */
  readonly output?: string | undefined;
  /** Format each editable source before it is emitted. */
  readonly format?:
    | ((source: { readonly path: string; readonly content: string }) => string | Promise<string>)
    | undefined;
  /** Editable-source import strings whose installation specifier is exceptional. */
  readonly imports?: Readonly<Record<string, string>> | undefined;
  /** Exact package requirements used instead of bare discovered dependency names. */
  readonly packages?: Readonly<Record<string, string>> | undefined;
  readonly items: VjscRegistryItemsOptions<Meta>;
  readonly styles?: VjscRegistryStylesOptions | undefined;
  readonly meta?: RegistryItem['meta'];
}
