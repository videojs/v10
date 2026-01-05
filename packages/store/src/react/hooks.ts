import type { TasksRecord } from '../core/queue';
import type { AnyStore, InferStoreRequests, InferStoreState, InferStoreTasks } from '../core/store';

import { isUndefined } from '@videojs/utils/predicate';

import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * Subscribes to a selected portion of state.
 * Re-renders only when the selected value changes.
 *
 * @param store - The store instance
 * @param selector - Function to select a portion of state
 * @returns The selected value
 */
export function useSelector<S extends AnyStore, T>(store: S, selector: (state: InferStoreState<S>) => T): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store.subscribe(selector as (state: object) => T, onStoreChange as (selected: T) => void),
    [store, selector],
  );

  const getSnapshot = useCallback(() => selector(store.state as InferStoreState<S>), [store, selector]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Returns the request map from the store.
 *
 * @param store - The store instance
 * @returns The request map
 */
export function useRequest<S extends AnyStore>(store: S): InferStoreRequests<S>;

/**
 * Returns a selected request from the store.
 *
 * @param store - The store instance
 * @param selector - Function to select a request
 * @returns The selected request
 */
export function useRequest<S extends AnyStore, T>(store: S, selector: (requests: InferStoreRequests<S>) => T): T;

export function useRequest<S extends AnyStore, T>(
  store: S,
  selector?: (requests: InferStoreRequests<S>) => T,
): InferStoreRequests<S> | T {
  if (isUndefined(selector)) {
    return store.request as InferStoreRequests<S>;
  }

  return selector(store.request as InferStoreRequests<S>);
}

/**
 * Subscribes to task state changes.
 * Returns the current tasks map from the queue.
 *
 * @param store - The store instance
 * @returns The tasks record
 */
export function useTasks<S extends AnyStore>(store: S): TasksRecord<InferStoreTasks<S>> {
  // Cache the tasks snapshot to ensure referential stability
  const tasksRef = useRef(store.queue.tasks);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store.queue.subscribe((tasks) => {
        tasksRef.current = tasks;
        onStoreChange();
      }),
    [store],
  );

  const getSnapshot = useCallback(() => tasksRef.current as TasksRecord<InferStoreTasks<S>>, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
