import type { Media, PlayerStore } from '@videojs/core/dom';

export interface PlayerProvider<Store extends PlayerStore> {
  readonly store: Store;
  media: Media | null;
}

export interface PlayerConsumer<Store extends PlayerStore> {
  readonly store: Store | null;
}
