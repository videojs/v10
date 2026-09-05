import type { InferPlayerHtmlConfig, PlayerStore } from '@videojs/core/dom';
import type { StoreHost } from '@videojs/store';
import type { Constructor } from '@videojs/utils/types';

import type { UIElement } from '@/ui/ui-element';

type PlayerProperties<Store extends PlayerStore> = {
  -readonly [Key in keyof InferPlayerHtmlConfig<Store>]?: InferPlayerHtmlConfig<Store>[Key] | undefined;
};

type PlayerHost<Store extends PlayerStore> = UIElement & PlayerProperties<Store>;

/** A player element with direct, typed access to its configured store state and actions. */
export type PlayerElement<Store extends PlayerStore> = StoreHost<Store, PlayerHost<Store>>;

export type PlayerElementConstructor<Store extends PlayerStore> = typeof UIElement & Constructor<PlayerElement<Store>>;
