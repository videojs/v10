import type { RegistryItem, Registry as ShadcnRegistrySchema } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';

type RegistryItemType = RegistryItem['type'];

export type ShadcnRegistry = ShadcnRegistrySchema;
export type ShadcnRegistryFile = NonNullable<RegistryItem['files']>[number];
export type ShadcnRegistryFileType = ShadcnRegistryFile['type'];

export interface ShadcnVariant {
  readonly name: string;
  /** Included source files projected through this variant. */
  readonly include: string | readonly string[];
  readonly exclude?: string | readonly string[] | undefined;
  /** Query parameters supplied to VJSC and inherited by relative imports. */
  readonly parameters: Readonly<Record<string, string>>;
}

export interface ShadcnModule<Item extends ComponentMeta = ComponentMeta> {
  /** Full host module ID, including projection query parameters. */
  readonly id: string;
  /** Absolute physical source filename. */
  readonly filename: string;
  readonly source: string;
  readonly meta?: Item | undefined;
  readonly variant?: ShadcnVariant | undefined;
}

export interface ShadcnItem {
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
  /** Optional source projections. Unmatched files are loaded once without a projection. */
  readonly variants?: readonly ShadcnVariant[] | undefined;
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
  /** Describe a discovered host module, or return null to keep it as an owned dependency. */
  readonly item: (module: ShadcnModule<Item>) => ShadcnItem | null;
  readonly styles?: ShadcnStyle | undefined;
}
