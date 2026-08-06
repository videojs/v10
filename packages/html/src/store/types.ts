import type { InferPlayerConfig, PlayerStore } from '@videojs/core/dom';
import type { Constructor } from '@videojs/utils/types';
import type { MediaElement } from '@/ui/media-element';

// ----------------------------------------
// PlayerProvider
// ----------------------------------------

type ProviderProperties<Store extends PlayerStore> = {
  -readonly [Key in keyof InferPlayerConfig<Store>]?: InferPlayerConfig<Store>[Key] | undefined;
};

export type PlayerProvider<Store extends PlayerStore> = MediaElement &
  ProviderProperties<Store> & {
    readonly store: Store;
  };

export interface PlayerProviderConstructor<Store extends PlayerStore> extends Constructor<PlayerProvider<Store>> {}

// ----------------------------------------
// PlayerConsumer
// ----------------------------------------

export interface PlayerConsumer<Store extends PlayerStore> extends MediaElement {
  readonly store: Store | null;
}

export interface PlayerConsumerConstructor<Store extends PlayerStore> extends Constructor<PlayerConsumer<Store>> {}
