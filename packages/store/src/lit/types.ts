import type { AnyFeature } from '../core/feature';
import type { Store } from '../core/store';

export interface StoreProvider<Features extends AnyFeature[]> {
  store: Store<Features>;
}

export interface StoreConsumer<Features extends AnyFeature[]> {
  readonly store: Store<Features> | null;
}
