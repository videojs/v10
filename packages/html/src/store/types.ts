import type { PlayerStore } from '@videojs/core/dom';
import type { Constructor } from '@videojs/utils/types';
import type { MediaElement } from '@/ui/media-element';

// ----------------------------------------
// PlayerProvider
// ----------------------------------------

/** Provider-side player element — owns the store and broadcasts it on `playerContext`. */
export interface PlayerProvider<Store extends PlayerStore> extends MediaElement {
  /** Player store owned by this provider. */
  readonly store: Store;
}

/** Constructor signature for classes assignable to `PlayerProvider`. */
export interface PlayerProviderConstructor<Store extends PlayerStore> extends Constructor<PlayerProvider<Store>> {}

// ----------------------------------------
// PlayerConsumer
// ----------------------------------------

/** Consumer-side player element — reads the store from context; `null` until the provider resolves. */
export interface PlayerConsumer<Store extends PlayerStore> extends MediaElement {
  /** Player store resolved from context, or `null` before connection. */
  readonly store: Store | null;
}

/** Constructor signature for classes assignable to `PlayerConsumer`. */
export interface PlayerConsumerConstructor<Store extends PlayerStore> extends Constructor<PlayerConsumer<Store>> {}
