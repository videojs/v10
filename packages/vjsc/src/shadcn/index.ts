import type { RegistryItem, Registry as ShadcnRegistrySchema } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';

type RegistryItemType = RegistryItem['type'];
type PublishedRegistryItemType = Extract<RegistryItemType, 'registry:block' | 'registry:component'>;
type SharedRegistryItemType = Extract<RegistryItemType, 'registry:lib' | 'registry:style'>;

export type ShadcnRegistry = ShadcnRegistrySchema;
export type ShadcnRegistryFile = NonNullable<RegistryItem['files']>[number];
export type ShadcnRegistryFileType = ShadcnRegistryFile['type'];

export interface ShadcnRegistrySharedFile {
  /** Source-relative input file. */
  readonly source: string;
  /** Path relative to the registry source root. Defaults to `source`. */
  readonly path?: string | undefined;
  /** Installation path relative to the registry install root. Defaults to `path`. */
  readonly target?: string | undefined;
  readonly type?: ShadcnRegistryFileType | undefined;
}

export interface ShadcnRegistrySharedItem {
  readonly name: string;
  readonly type: SharedRegistryItemType;
  readonly title: string;
  readonly description: string;
  readonly files: readonly ShadcnRegistrySharedFile[];
  readonly dependencies?: readonly string[] | undefined;
  readonly requiredBy?:
    | 'all'
    | {
        readonly imports: readonly string[];
      }
    | undefined;
  readonly meta?: RegistryItem['meta'];
}

export interface ShadcnRegistryItemDescription {
  readonly type: PublishedRegistryItemType;
  readonly title: string;
  readonly description: string;
  readonly meta?: RegistryItem['meta'];
}

/** Plain publication policy consumed by the build-only Shadcn bundler plugin. */
export interface ShadcnRegistryDefinition<Item extends ComponentMeta = ComponentMeta> {
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
  readonly items: {
    readonly published: readonly Item['name'][];
    readonly shared?: readonly ShadcnRegistrySharedItem[] | undefined;
    describe(item: Item): ShadcnRegistryItemDescription;
  };
}

/** Preserve a plain Shadcn publication definition while checking its shape. */
export function defineShadcnRegistry<
  Item extends ComponentMeta,
  const Definition extends ShadcnRegistryDefinition<Item>,
>(definition: Definition): Definition {
  return definition;
}
