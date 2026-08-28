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
  /** Included registry path, such as `react/components` or `html/skins`. */
  readonly group: string;
  readonly type: Extract<RegistryItemType, 'registry:block' | 'registry:component' | 'registry:lib'>;
  readonly title: string;
  readonly description: string;
  /** Installed filename for the item's root module. Defaults to its source filename. */
  readonly filename?: string | undefined;
  /** Root-module target relative to the configured installation directory. */
  readonly target: string;
  readonly dependencies?: readonly string[] | undefined;
  readonly registryDependencies?: readonly string[] | undefined;
  /** Include the shared editable-style item. Defaults to true when one is configured. */
  readonly styles?: boolean | undefined;
  /** Aggregate VJSC virtual CSS and optional registry-root files into one installed stylesheet. */
  readonly stylesheet?:
    | {
        readonly target: string;
        readonly files?: readonly string[] | undefined;
        /** Import the installed stylesheet from the item's root source. */
        readonly import?: boolean | undefined;
      }
    | undefined;
  readonly meta?: RegistryItem['meta'];
}

export interface ShadcnStyle {
  /** CSS entry whose relative imports are published with it. */
  readonly input: string;
  readonly name?: string | undefined;
  readonly group: string;
  /** Entry target relative to the configured installation directory. */
  readonly target: string;
  /** Installed filename for the CSS entry. Defaults to its source filename. */
  readonly filename?: string | undefined;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly meta?: RegistryItem['meta'];
}

export interface ShadcnAuthoredFile {
  /** Source content stored in the prepared registry. */
  readonly content: string;
  /** Installed path relative to the configured installation directory. */
  readonly target: string;
  readonly type: Extract<
    ShadcnRegistryFileType,
    'registry:component' | 'registry:file' | 'registry:lib' | 'registry:style'
  >;
}

/** A registry item whose source is authored outside the VJSC module graph. */
export interface ShadcnAuthoredItem {
  readonly name: string;
  readonly group: string;
  readonly type: Extract<RegistryItemType, 'registry:block' | 'registry:component' | 'registry:lib'>;
  readonly title: string;
  readonly description: string;
  readonly files: readonly ShadcnAuthoredFile[];
  readonly dependencies?: readonly string[] | undefined;
  readonly registryDependencies?: readonly string[] | undefined;
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
    readonly install: string;
    readonly import: string;
  };
  /** Editable-source import strings whose installation specifier is exceptional. */
  readonly imports?: Readonly<Record<string, string>> | undefined;
  /** Exact package requirements used instead of bare discovered dependency names. */
  readonly packages?: Readonly<Record<string, string>> | undefined;
  /** Source-owned blocks and facades that do not pass through the VJSC compiler. */
  readonly items?: readonly ShadcnAuthoredItem[] | undefined;
  readonly meta?: RegistryItem['meta'];
  readonly styles?: ShadcnStyle | undefined;
}
