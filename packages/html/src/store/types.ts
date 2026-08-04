import type { PlayerStore } from '@videojs/core/dom';
import type { ConfigPatch, InferStoreConfig } from '@videojs/store';
import type { Constructor } from '@videojs/utils/types';
import type { MediaElement } from '@/ui/media-element';

// ----------------------------------------
// PlayerProvider
// ----------------------------------------

export type PlayerProvider<Store extends PlayerStore> = MediaElement &
  ConfigPatch<InferStoreConfig<Store>> & {
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
