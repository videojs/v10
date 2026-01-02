import type { Context } from '@lit/context';
import type { AnyStore } from '../store';

/**
 * A Lit context typed for a store.
 */
export type StoreContext<S extends AnyStore = AnyStore> = Context<unknown, S>;
