import type { Media, PlayerStore } from '@videojs/core/dom';
import type { Constructor } from '@videojs/utils/types';
import type { MediaElement } from '@/ui/media-element';

// ----------------------------------------
// PlayerElement
// ----------------------------------------

export interface PlayerElement<Store extends PlayerStore> extends MediaElement, PlayerProvider<Store> {}

export interface PlayerElementConstructor<Store extends PlayerStore> extends Constructor<PlayerElement<Store>> {}

// ----------------------------------------
// PlayerProvider
// ----------------------------------------

export interface PlayerProvider<Store extends PlayerStore> extends MediaElement {
  readonly store: Store;
  media: Media | null;
}

export interface PlayerProviderConstructor<Store extends PlayerStore> extends Constructor<PlayerProvider<Store>> {}

// ----------------------------------------
// PlayerConsumer
// ----------------------------------------

export interface PlayerConsumer<Store extends PlayerStore> extends MediaElement {
  readonly store: Store | null;
}

export interface PlayerConsumerConstructor<Store extends PlayerStore> extends Constructor<PlayerConsumer<Store>> {}
