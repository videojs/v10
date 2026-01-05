import type { FC, ReactNode } from 'react';
import type { TasksRecord } from '../core/queue';
import type { AnySlice, InferSliceTarget, UnionSliceRequests, UnionSliceState, UnionSliceTasks } from '../core/slice';
import type { Store, StoreConfig } from '../core/store';

/**
 * Configuration for `createStore`.
 */
export interface CreateStoreConfig<Slices extends AnySlice[]> extends StoreConfig<
  InferSliceTarget<Slices[number]>,
  Slices
> {
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
  store?: Store<InferSliceTarget<Slices[number]>, Slices>;
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
  useStore: () => Store<InferSliceTarget<Slices[number]>, Slices>;

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
  create: () => Store<InferSliceTarget<Slices[number]>, Slices>;
}
