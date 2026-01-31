import { isUndefined } from '@videojs/utils/predicate';
import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { AnyFeature, UnionFeatureRequests, UnionFeatureState, UnionFeatureTarget } from '../core/feature';
import type { StoreConfig } from '../core/store';

import { Store } from '../core/store';
import { StoreContextProvider, useStoreContext } from './context';
import { useStore as useStoreBase } from './hooks/use-store';

// ----------------------------------------
// Types
// ----------------------------------------

export interface CreateStoreConfig<Features extends AnyFeature[]>
  extends StoreConfig<UnionFeatureTarget<Features>, Features> {
  /** Display name for React DevTools. */
  displayName?: string;
}

export interface ProviderProps<Features extends AnyFeature[]> {
  children: ReactNode;
  /**
   * Optional pre-created store instance.
   * If provided, the Provider will use this store instead of creating one.
   * The Provider will NOT destroy this store on unmount.
   */
  store?: Store<UnionFeatureTarget<Features>, Features>;
}

export type UseStoreResult<Features extends AnyFeature[]> = UnionFeatureState<Features> &
  UnionFeatureRequests<Features>;

export interface CreateStoreResult<Features extends AnyFeature[]> {
  /** Provider component that creates and manages the store lifecycle. */
  Provider: FC<ProviderProps<Features>>;

  /**
   * Subscribe to store state and access requests.
   * Returns state with request map, re-renders when state changes.
   */
  useStore: () => UseStoreResult<Features>;

  /**
   * Creates a new store instance.
   * Useful for imperative access or creating a store before render.
   */
  create: () => Store<UnionFeatureTarget<Features>, Features>;
}

// ----------------------------------------
// Implementation
// ----------------------------------------

/**
 * Creates a store factory that returns a Provider and typed hooks.
 *
 * @param config - Store configuration including features and optional lifecycle hooks
 * @returns An object containing Provider, hooks, and a create function
 *
 * @example
 * ```tsx
 * const { Provider, useStore, useQueue, create } = createStore({
 *   features: [playbackFeature, presentationFeature],
 * });
 * ```
 */
export function createStore<Features extends AnyFeature[]>(
  config: CreateStoreConfig<Features>
): CreateStoreResult<Features> {
  type Target = UnionFeatureTarget<Features>;
  type StoreType = Store<Target, Features>;

  function create(): StoreType {
    return new Store(config);
  }

  /**
   * Provider component that manages store lifecycle.
   *
   * If `store` prop is provided, uses that store (no cleanup on unmount).
   * Otherwise, creates a new store and destroys it on unmount.
   */
  function Provider({ children, store: providedStore }: ProviderProps<Features>): ReactNode {
    const [store] = useState<StoreType>(() => {
      if (!isUndefined(providedStore)) {
        return providedStore;
      }

      return create();
    });

    const isOwner = isUndefined(providedStore);

    useEffect(() => {
      if (isOwner) {
        return () => store.destroy();
      }

      return undefined;
    }, [store, isOwner]);

    return <StoreContextProvider store={store}>{children}</StoreContextProvider>;
  }

  // Set display name for React DevTools
  if (config.displayName) {
    Provider.displayName = `${config.displayName}.Provider`;
  }

  function useStore(): UseStoreResult<Features> {
    const store = useStoreContext();
    return useStoreBase(store) as UseStoreResult<Features>;
  }

  return {
    Provider,
    useStore,
    create,
  };
}
