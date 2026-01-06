import type { EnsureFunction } from '@videojs/utils/types';
import type { FC, ReactNode } from 'react';
import type { TasksRecord } from '../core/queue';
import type { AnySlice, UnionSliceRequests, UnionSliceState, UnionSliceTarget, UnionSliceTasks } from '../core/slice';
import type { StoreConfig } from '../core/store';
import type { MutationResult } from '../shared/types';

import { isNull, isUndefined } from '@videojs/utils/predicate';

import { useEffect, useState } from 'react';

import { Store } from '../core/store';
import { StoreContextProvider, useParentStore, useStoreContext } from './context';
import {
  useMutation as useMutationBase,
  useRequest as useRequestBase,
  useSelector as useSelectorBase,
  useTasks as useTasksBase,
} from './hooks';

// ----------------------------------------
// Types
// ----------------------------------------

export interface CreateStoreConfig<Slices extends AnySlice[]> extends StoreConfig<UnionSliceTarget<Slices>, Slices> {
  /**
   * Display name for React DevTools.
   */
  displayName?: string;
}

export interface ProviderProps<Slices extends AnySlice[]> {
  children: ReactNode;
  /**
   * Optional pre-created store instance.
   * If provided, the Provider will use this store instead of creating one.
   * The Provider will NOT destroy this store on unmount.
   */
  store?: Store<UnionSliceTarget<Slices>, Slices>;
  /**
   * If true, inherits the store from a parent Provider context instead of creating a new one.
   * Useful when wrapping a skin with your own Provider to add custom hooks.
   * Defaults to false (isolated store).
   */
  inherit?: boolean;
}

export interface CreateStoreResult<Slices extends AnySlice[]> {
  /**
   * Provider component that creates and manages the store lifecycle.
   */
  Provider: FC<ProviderProps<Slices>>;

  /**
   * Returns the typed store instance from context.
   */
  useStore: () => Store<UnionSliceTarget<Slices>, Slices>;

  /**
   * Subscribes to a selected portion of state.
   * Re-renders only when the selected value changes.
   */
  useSelector: <T>(selector: (state: UnionSliceState<Slices>) => T) => T;

  /**
   * Returns the request map or a selected request.
   */
  useRequest: {
    (): UnionSliceRequests<Slices>;
    <T>(selector: (requests: UnionSliceRequests<Slices>) => T): T;
  };

  /**
   * Subscribes to task state changes.
   * Returns the current tasks map from the queue.
   */
  useTasks: () => TasksRecord<UnionSliceTasks<Slices>>;

  /**
   * Track a request as a mutation with status, data, and error.
   * Returns boolean helpers (`isPending`, `isSuccess`, `isError`) for ergonomic use.
   */
  useMutation: <
    Name extends keyof UnionSliceRequests<Slices>,
    Mutate extends UnionSliceRequests<Slices>[Name] = UnionSliceRequests<Slices>[Name],
  >(
    name: Name,
  ) => MutationResult<Mutate, Awaited<ReturnType<EnsureFunction<Mutate>>>>;

  /**
   * Creates a new store instance.
   * Useful for imperative access or creating a store before render.
   */
  create: () => Store<UnionSliceTarget<Slices>, Slices>;
}

// ----------------------------------------
// Implementation
// ----------------------------------------

/**
 * Creates a store factory that returns a Provider and typed hooks.
 *
 * @param config - Store configuration including slices and optional lifecycle hooks
 * @returns An object containing Provider, hooks, and a create function
 *
 * @example
 * ```tsx
 * const { Provider, useStore, useSelector, useRequest, useTasks, create } = createStore({
 *   slices: [playbackSlice, presentationSlice],
 * });
 * ```
 */
export function createStore<Slices extends AnySlice[]>(config: CreateStoreConfig<Slices>): CreateStoreResult<Slices> {
  type Target = UnionSliceTarget<Slices>;
  type State = UnionSliceState<Slices>;
  type Requests = UnionSliceRequests<Slices>;
  type Tasks = UnionSliceTasks<Slices>;
  type StoreType = Store<Target, Slices>;

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
  function Provider({ children, store: providedStore, inherit = false }: ProviderProps<Slices>): ReactNode {
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

  function useSelector<T>(selector: (state: State) => T): T {
    const store = useStore();
    return useSelectorBase(store, selector);
  }

  function useRequest(): Requests;
  function useRequest<T>(selector: (requests: Requests) => T): T;
  function useRequest<T>(selector?: (requests: Requests) => T): Requests | T {
    const store = useStore();
    const requests = useRequestBase(store);

    if (isUndefined(selector)) {
      return requests;
    }

    return selector(requests);
  }

  function useTasks(): TasksRecord<Tasks> {
    const store = useStore();
    return useTasksBase(store);
  }

  /**
   * Track a request as a mutation with status, data, and error.
   */
  function useMutation<Name extends keyof Requests, Mutate extends Requests[Name] = Requests[Name]>(
    name: Name,
  ): MutationResult<Mutate, Awaited<ReturnType<EnsureFunction<Mutate>>>> {
    const store = useStore();
    return useMutationBase(store, name);
  }

  return {
    Provider,
    useStore,
    useSelector,
    useRequest: useRequest as CreateStoreResult<Slices>['useRequest'],
    useTasks,
    useMutation,
    create,
  };
}
