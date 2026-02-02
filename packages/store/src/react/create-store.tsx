import { isUndefined } from '@videojs/utils/predicate';
import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { StoreConfig } from '../core/config';
import type { AnyFeature } from '../core/feature';
import type { AnyStore, FeatureStore } from '../core/store';
import { createStore as createCoreStore } from '../core/store';
import { StoreContextProvider, useStoreContext } from './context';
import { useStore as useStoreBase } from './hooks/use-store';

export interface CreateStoreConfig<Features extends AnyFeature[]> extends StoreConfig<Features> {
  displayName?: string;
}

export interface ProviderProps<S extends AnyStore> {
  children: ReactNode;
  store?: S;
}

export interface CreateStoreResult<S extends AnyStore> {
  /** Provider component that creates and manages the store lifecycle. */
  Provider: FC<ProviderProps<S>>;

  /**
   * Access store state and actions.
   * Returns the store without subscribing to changes.
   * Use selectors via `useSelector` for reactive updates.
   */
  useStore: () => S;

  /**
   * Creates a new store instance.
   * Useful for imperative access or creating a store before render.
   */
  create: () => S;
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
): CreateStoreResult<FeatureStore<Features>> {
  type Store = FeatureStore<Features>;

  function create(): Store {
    return createCoreStore(config);
  }

  /**
   * Provider component that manages store lifecycle.
   *
   * If `store` prop is provided, uses that store (no cleanup on unmount).
   * Otherwise, creates a new store and destroys it on unmount.
   */
  function Provider({ children, store: providedStore }: ProviderProps<Store>): ReactNode {
    const [store] = useState<Store>(() => {
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

  function useStore(): Store {
    const store = useStoreContext();
    return useStoreBase(store) as Store;
  }

  return {
    Provider,
    useStore,
    create,
  };
}
