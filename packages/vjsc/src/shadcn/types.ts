import type { Registry, RegistryItem } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';
import type { ComponentGraphModule, ComponentGraphPluginApi } from '../graph';

export type ShadcnRegistry = Registry;
export type ShadcnRegistryFile = NonNullable<RegistryItem['files']>[number];
export type ShadcnRegistryFileType = ShadcnRegistryFile['type'];

export interface VjscRegistryItemMeta<Item extends ComponentMeta = ComponentMeta> {
  readonly module: ComponentGraphModule<Item>;
  /** Included registry path, such as `components` or `skins`. */
  readonly group: string;
  /** Root-module target relative to the configured installation directory. */
  readonly target: string;
  /** Installed filename for the item's root module. Defaults to its source filename. */
  readonly filename?: string | undefined;
  /** Include transformed style assets used by this item's module closure. */
  readonly stylesheet?:
    | {
        readonly target: string;
        readonly files?: readonly string[] | undefined;
        /** Import the installed stylesheet from the item's root source. */
        readonly import?: boolean | undefined;
      }
    | undefined;
}

/** Official Shadcn item fields plus compiler-only VJSC build metadata. */
export type VjscRegistryItem<Item extends ComponentMeta = ComponentMeta> = RegistryItem & {
  readonly $vjsc: VjscRegistryItemMeta<Item>;
};

export interface ShadcnRegistryPluginOptions<Item extends ComponentMeta = ComponentMeta> {
  readonly name: string;
  readonly homepage: string;
  readonly namespace: string;
  readonly paths: {
    readonly install: string;
    readonly import: string;
  };
  /** Directory below the Rolldown output root where this catalog is emitted. */
  readonly output?: string | undefined;
  /** Editable-source import strings whose installation specifier is exceptional. */
  readonly imports?: Readonly<Record<string, string>> | undefined;
  /** Exact package requirements used instead of bare discovered dependency names. */
  readonly packages?: Readonly<Record<string, string>> | undefined;
  /** Describe registry ownership after every requested graph transformation is complete. */
  readonly items: (modules: readonly ComponentGraphModule<Item>[]) => readonly VjscRegistryItem<Item>[];
  readonly meta?: RegistryItem['meta'];
}

export interface ComponentGraphProvider<Item extends ComponentMeta = ComponentMeta> {
  readonly api?: ComponentGraphPluginApi<Item> | undefined;
}
