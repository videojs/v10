import { isUndefined } from '@videojs/utils/predicate';
import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { StoreConfig } from '../core/config';
import type { AnyFeature, UnionFeatureState } from '../core/feature';
import type { Store } from '../core/store';
import { createStore as createCoreStore } from '../core/store';
import { StoreContextProvider, useStoreContext } from './context';
import { useStore as useStoreBase } from './hooks/use-store';

export interface CreateStoreConfig<Features extends AnyFeature[]> extends StoreConfig<Features> {
  displayName?: string;
}

export interface ProviderProps<Features extends AnyFeature[]> {
  children: ReactNode;
  store?: Store<Features>;
}

export type UseStoreResult<Features extends AnyFeature[]> = UnionFeatureState<Features>;

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
  create: () => Store<Features>;
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
  type StoreType = Store<Features>;

  function create(): StoreType {
    return createCoreStore(config);
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
