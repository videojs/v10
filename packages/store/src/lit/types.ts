import type { AnyStore } from '../core/store';

export interface StoreProvider<Store extends AnyStore> {
  store: Store;
}

export interface StoreConsumer<Store extends AnyStore> {
  readonly store: Store | null;
}
