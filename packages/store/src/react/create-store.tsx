import type { FC, ReactNode } from 'react';
import type { TasksRecord } from '../core/queue';
import type { AnySlice, UnionSliceRequests, UnionSliceState, UnionSliceTarget, UnionSliceTasks } from '../core/slice';
import type { StoreConfig } from '../core/store';

import { isNull, isUndefined } from '@videojs/utils/predicate';

import { useEffect, useState } from 'react';

import { Store } from '../core/store';
import { StoreContextProvider, useParentStore, useStoreContext } from './context';
import { useRequest as useRequestBase, useSelector as useSelectorBase, useTasks as useTasksBase } from './hooks';

// ----------------------------------------
// Types
// ----------------------------------------

/**
 * Configuration for `createStore`.
 */
export interface CreateStoreConfig<Slices extends AnySlice[]> extends StoreConfig<UnionSliceTarget<Slices>, Slices> {
  /**
   * Display name for React DevTools.
   */
  displayName?: string;
}

/**
 * Props for the Provider component returned by `createStore`.
 */
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

/**
 * Result of `createStore`.
 */
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
 *
 * function App() {
 *   return (
 *     <Provider>
 *       <Video />
 *       <Controls />
 *     </Provider>
 *   );
 * }
 *
 * function Controls() {
 *   const paused = useSelector((s) => s.paused);
 *   const play = useRequest((r) => r.play);
 *   return <button onClick={() => play()}>{paused ? 'Play' : 'Pause'}</button>;
 * }
 * ```
 */
export function createStore<Slices extends AnySlice[]>(config: CreateStoreConfig<Slices>): CreateStoreResult<Slices> {
  type Target = UnionSliceTarget<Slices>;
  type State = UnionSliceState<Slices>;
  type Requests = UnionSliceRequests<Slices>;
  type Tasks = UnionSliceTasks<Slices>;
  type StoreType = Store<Target, Slices>;

  /**
   * Creates a new store instance.
   */
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

  /**
   * Returns the typed store instance from context.
   */
  function useStore(): StoreType {
    return useStoreContext() as StoreType;
  }

  /**
   * Subscribes to a selected portion of state.
   */
  function useSelector<T>(selector: (state: State) => T): T {
    const store = useStore();
    return useSelectorBase(store, selector);
  }

  /**
   * Returns the request map or a selected request.
   */
  function useRequest(): Requests;
  function useRequest<T>(selector: (requests: Requests) => T): T;
  function useRequest<T>(selector?: (requests: Requests) => T): Requests | T {
    const store = useStore();
    // useRequestBase doesn't use React hooks internally, but we always call it
    // to maintain consistent hook call order (even though it's technically not required)
    const requests = useRequestBase(store) as Requests;

    if (isUndefined(selector)) {
      return requests;
    }

    return selector(requests);
  }

  /**
   * Subscribes to task state changes.
   */
  function useTasks(): TasksRecord<Tasks> {
    const store = useStore();
    return useTasksBase(store);
  }

  return {
    Provider,
    useStore,
    useSelector,
    useRequest: useRequest as CreateStoreResult<Slices>['useRequest'],
    useTasks,
    create,
  };
}
