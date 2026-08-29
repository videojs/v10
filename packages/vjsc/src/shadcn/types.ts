import type { Registry, RegistryItem } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';
import type { ComponentGraph, ComponentGraphModule } from '../graph';
export type { ComponentGraphProvider } from '../graph';

export type ShadcnRegistry = Registry;
export type ShadcnRegistryFile = NonNullable<RegistryItem['files']>[number];
export type ShadcnRegistryFileType = ShadcnRegistryFile['type'];

export interface VjscRegistrySourceItemMeta<Item extends ComponentMeta = ComponentMeta> {
  readonly kind?: 'source' | undefined;
  readonly module: ComponentGraphModule<Item>;
  /** Included registry path, such as `components` or `skins`. */
  readonly group: string;
  /** Root-module target relative to the configured installation directory. */
  readonly target: string | ((module: ComponentGraphModule<Item>, root: ComponentGraphModule<Item>) => string);
  /** Installed filename for the item's root module. Defaults to its source filename. */
  readonly filename?: string | undefined;
  /** Import replacements applied while packaging this item. */
  readonly imports?: Readonly<Record<string, string>> | undefined;
  /** Installed stylesheets imported from the item's root module. */
  readonly styleImports?: readonly string[] | undefined;
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

export interface VjscRegistryStyleItemMeta<Item extends ComponentMeta = ComponentMeta> {
  readonly kind: 'style';
  /** Included registry path, such as `support` or `styles`. */
  readonly group: string;
  /** Modules whose finalized style assets are aggregated into this item. */
  readonly modules: readonly ComponentGraphModule<Item>[];
  /** Compiled VJSC style output filename, such as `buttons.css`. */
  readonly asset?: string | undefined;
  /** Stable stylesheet target relative to the configured installation directory. */
  readonly target: string;
  /** Additional authored CSS files, relative to the graph root. */
  readonly files?: readonly string[] | undefined;
}

export interface VjscRegistryManifestItemMeta {
  readonly kind: 'manifest';
  /** Included registry path, such as `support`. */
  readonly group: string;
}

export type VjscRegistryItemMeta<Item extends ComponentMeta = ComponentMeta> =
  | VjscRegistrySourceItemMeta<Item>
  | VjscRegistryStyleItemMeta<Item>
  | VjscRegistryManifestItemMeta;

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
  readonly items: (graph: ComponentGraph<Item>) => readonly VjscRegistryItem<Item>[];
  readonly meta?: RegistryItem['meta'];
}
