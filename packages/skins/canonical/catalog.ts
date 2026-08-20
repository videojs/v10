import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type CatalogItemMeta, defineCatalog, discoverCatalogItems } from 'vjsc/catalog';

export interface ComponentMeta extends CatalogItemMeta {
  readonly type: 'component';
  readonly title: string;
  readonly description: string;
}

export interface SkinMeta extends CatalogItemMeta {
  readonly type: 'skin';
  readonly title: string;
  readonly description: string;
  readonly style: {
    readonly scope: string;
    readonly theme: keyof typeof resources.styles.themes;
    readonly variant: string;
  };
}

export type SkinCatalogMeta = ComponentMeta | SkinMeta;

const resources = {
  styles: {
    tailwind: {
      compiler: './styles/tailwind.css',
      registry: './styles/tailwind.registry.css',
      shared: './styles/tailwind.shared.css',
    },
    base: './styles/base.css',
    shared: ['./styles/captions.css', './styles/themes/video.css'],
    themes: {
      default: './styles/themes/default.css',
      minimal: './styles/themes/minimal.css',
    },
  },
} as const;

/** Canonical Skin source catalog shared by package, registry, and future documentation outputs. */
export const skinCatalog = defineCatalog({
  components: ['@videojs/core/vjsc', '@videojs/icons/vjsc'],
  resources,
  allowedImports: [
    '@videojs/core',
    '@videojs/utils/style',
    'vjsc/styles',
    'vjsc/components',
    'vjsc/catalog',
    /^@videojs\/core\/i18n\/text\//,
  ],
  imports: {
    '@videojs/core/vjsc': 'components',
    '@videojs/icons/vjsc': 'icons',
  },
  items: discoverCatalogItems<SkinCatalogMeta>({
    rootDir: dirname(fileURLToPath(import.meta.url)),
    files: ['./components/**/*.tsx', './skins/*/skin.tsx'],
  }),
});

export type SkinItemName = (typeof skinCatalog.items)[number]['name'];
export type SkinName = Extract<(typeof skinCatalog.items)[number], { readonly type: 'skin' }>['name'];
