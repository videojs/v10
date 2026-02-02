import type { Media, PlayerStore } from '@videojs/core/dom';

export interface PlayerStoreProvider<Store extends PlayerStore> {
  readonly store: Store;
  media: Media | null;
}

export interface PlayerStoreConsumer<Store extends PlayerStore> {
  readonly store: Store | null;
}
