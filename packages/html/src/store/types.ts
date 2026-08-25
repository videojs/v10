import type { InferPlayerHtmlConfig, PlayerStore } from '@videojs/core/dom';
import type { Constructor } from '@videojs/utils/types';

import type { UIElement } from '@/ui/ui-element';

// ----------------------------------------
// PlayerProvider
// ----------------------------------------

type ProviderProperties<Store extends PlayerStore> = {
  -readonly [Key in keyof InferPlayerHtmlConfig<Store>]?: InferPlayerHtmlConfig<Store>[Key] | undefined;
};

export type PlayerProvider<Store extends PlayerStore> = UIElement &
  ProviderProperties<Store> & {
    readonly store: Store;
  };

export interface PlayerProviderConstructor<Store extends PlayerStore> extends Constructor<PlayerProvider<Store>> {}
