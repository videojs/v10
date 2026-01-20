import type { FC, ReactNode } from 'react';
import type { AnyFeature, UnionFeatureRequests, UnionFeatureState, UnionFeatureTarget, UnionFeatureTasks } from '../core/feature';
import type { TasksRecord } from '../core/queue';
import type { StoreConfig } from '../core/store';

import { isNull, isUndefined } from '@videojs/utils/predicate';

import { useEffect, useState } from 'react';

import { Store } from '../core/store';
import { StoreContextProvider, useParentStore, useStoreContext } from './context';
import { useRequest as useRequestBase, useSnapshot as useSnapshotBase, useTasks as useTasksBase } from './hooks';

// ----------------------------------------
// Types
// ----------------------------------------

export interface CreateStoreConfig<Features extends AnyFeature[]> extends StoreConfig<UnionFeatureTarget<Features>, Features> {
  /**
   * Display name for React DevTools.
   */
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
  /**
   * If true, inherits the store from a parent Provider context instead of creating a new one.
   * Useful when wrapping a skin with your own Provider to add custom hooks.
   * Defaults to false (isolated store).
   */
  inherit?: boolean;
}

export interface CreateStoreResult<Features extends AnyFeature[]> {
  /**
   * Provider component that creates and manages the store lifecycle.
   */
  Provider: FC<ProviderProps<Features>>;

  /**
   * Returns the typed store instance from context.
   */
  useStore: () => Store<UnionFeatureTarget<Features>, Features>;

  /**
   * Returns a snapshot of the store state.
   * Re-renders when state changes.
   */
  useSnapshot: () => UnionFeatureState<Features>;

  /**
   * Returns the request map or a specific request by name.
   */
  useRequest: {
    (): UnionFeatureRequests<Features>;
    <Name extends keyof UnionFeatureRequests<Features>>(name: Name): UnionFeatureRequests<Features>[Name];
  };

  /**
   * Subscribes to task state changes.
   * Returns the current tasks map from the queue.
   */
  useTasks: () => TasksRecord<UnionFeatureTasks<Features>>;

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
 * const { Provider, useStore, useSnapshot, useRequest, useTasks, create } = createStore({
 *   features: [playbackFeature, presentationFeature],
 * });
 * ```
 */
export function createStore<Features extends AnyFeature[]>(config: CreateStoreConfig<Features>): CreateStoreResult<Features> {
  type Target = UnionFeatureTarget<Features>;
  type State = UnionFeatureState<Features>;
  type Requests = UnionFeatureRequests<Features>;
  type Tasks = UnionFeatureTasks<Features>;
  type StoreType = Store<Target, Features>;

  function create(): StoreType {
    return new Store(config);
  }

  /**
   * Provider component that manages store lifecycle.
   *
   * Resolution order:
   * 1. If `store` prop provided, uses that store (no cleanup on unmount)
   * 2. If `inherit={true}` and parent store exists, uses parent store (no cleanup)
   * 3. Otherwise, creates a new store and destroys it on unmount
   */
  function Provider({ children, store: providedStore, inherit = false }: ProviderProps<Features>): ReactNode {
    const parentStore = useParentStore();
    const shouldInherit = inherit && !isNull(parentStore);

    const [store] = useState<StoreType>(() => {
      if (!isUndefined(providedStore)) {
        return providedStore;
      }

      if (shouldInherit) {
        return parentStore as StoreType;
      }

      return create();
    });

    // Only destroy if we created the store (not provided, not inherited)
    const isOwner = isUndefined(providedStore) && !shouldInherit;

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

  function useStore(): StoreType {
    return useStoreContext() as StoreType;
  }

  function useSnapshot(): State {
    const store = useStore();
    return useSnapshotBase(store.state) as State;
  }

  function useRequest(): Requests;
  function useRequest<Name extends keyof Requests>(name: Name): Requests[Name];
  function useRequest<Name extends keyof Requests>(name?: Name): Requests | Requests[Name] {
    const store = useStore();
    return useRequestBase(store, name as Name);
  }

  function useTasks(): TasksRecord<Tasks> {
    const store = useStore();
    return useTasksBase(store);
  }

  return {
    Provider,
    useStore,
    useSnapshot,
    useRequest: useRequest as CreateStoreResult<Features>['useRequest'],
    useTasks,
    create,
  };
}
