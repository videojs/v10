import type { RegistryItem, Registry as ShadcnRegistrySchema } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';

type RegistryItemType = RegistryItem['type'];

export type ShadcnRegistry = ShadcnRegistrySchema;
export type ShadcnRegistryFile = NonNullable<RegistryItem['files']>[number];
export type ShadcnRegistryFileType = ShadcnRegistryFile['type'];

export interface ShadcnModule<Item extends ComponentMeta = ComponentMeta> {
  /** Full host module ID, including its VJSC transform query. */
  readonly id: string;
  /** Absolute physical source filename. */
  readonly filename: string;
  /** VJSC transform selection used to produce this editable module. */
  readonly transform: Readonly<Record<string, string>>;
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
  readonly publish: {
    /**
     * Select the target configurations loaded for each discovered file. Component metadata is captured later from
     * transformed host modules and is therefore not available in this inventory hook.
     */
    readonly modules?:
      | ((
          module: Omit<ShadcnModule<Item>, 'meta'>,
          modules: readonly Omit<ShadcnModule<Item>, 'meta'>[]
        ) => readonly Readonly<Record<string, string>>[])
      | undefined;
    /** Describe the published registry items after every requested transformation is complete. */
    readonly items: (modules: readonly ShadcnModule<Item>[]) => readonly ShadcnItem<Item>[];
  };
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
  readonly styles?: ShadcnStyle | undefined;
}
