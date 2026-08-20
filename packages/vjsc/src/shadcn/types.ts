import type { RegistryItem, Registry as ShadcnRegistrySchema } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';

type RegistryItemType = RegistryItem['type'];

export type ShadcnRegistry = ShadcnRegistrySchema;
export type ShadcnRegistryFile = NonNullable<RegistryItem['files']>[number];
export type ShadcnRegistryFileType = ShadcnRegistryFile['type'];

export interface ShadcnModule<Item extends ComponentMeta = ComponentMeta> {
  /** Full host module ID, including projection query parameters. */
  readonly id: string;
  /** Absolute physical source filename. */
  readonly filename: string;
  /** Query parameters supplied to source transforms. */
  readonly parameters: URLSearchParams;
  readonly meta?: Item | undefined;
}

export interface ShadcnItem<Item extends ComponentMeta = ComponentMeta> {
  /** Discovered module published by this item. */
  readonly module: ShadcnModule<Item>;
  readonly name: string;
  readonly type: Extract<RegistryItemType, 'registry:block' | 'registry:component' | 'registry:lib'>;
  readonly title: string;
  readonly description: string;
  /** Installed filename for the item's root module. Defaults to its source filename. */
  readonly filename?: string | undefined;
  readonly meta?: RegistryItem['meta'];
}

export interface ShadcnStyle {
  /** CSS entry whose relative imports are published with it. */
  readonly input: string;
  readonly name?: string | undefined;
  /** Installed filename for the CSS entry. Defaults to its source filename. */
  readonly filename?: string | undefined;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly meta?: RegistryItem['meta'];
}

export interface ShadcnPluginOptions<Item extends ComponentMeta = ComponentMeta> {
  /** Root containing editable registry source. */
  readonly root: string;
  /** Complete root-relative source inventory loaded through the host graph. */
  readonly include: string | readonly string[];
  readonly exclude?: string | readonly string[] | undefined;
  /** Select the VJSC query contexts in which each discovered module is transformed. */
  readonly parameters?:
    | ((
        module: ShadcnModule<Item>,
        modules: readonly ShadcnModule<Item>[]
      ) => readonly Readonly<Record<string, string>>[])
    | undefined;
  readonly name: string;
  readonly homepage: string;
  readonly namespace: string;
  readonly paths: {
    readonly output: string;
    readonly source: string;
    readonly install: string;
    readonly import: string;
  };
  /** Editable-source import strings whose installation specifier is exceptional. */
  readonly imports?: Readonly<Record<string, string>> | undefined;
  readonly meta?: RegistryItem['meta'];
  /** Describe the published registry items after every source projection has been transformed. */
  readonly items: (modules: readonly ShadcnModule<Item>[]) => readonly ShadcnItem<Item>[];
  readonly styles?: ShadcnStyle | undefined;
}
