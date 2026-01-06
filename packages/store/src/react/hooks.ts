import type { TasksRecord } from '../core/queue';
import type { AnyStore, InferStoreRequests, InferStoreState, InferStoreTasks } from '../core/store';

import { isUndefined } from '@videojs/utils/predicate';

import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * Subscribe to selected state. Re-renders only when selected value changes.
 */
export function useSelector<S extends AnyStore, T>(store: S, selector: (state: InferStoreState<S>) => T): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store.subscribe(selector, onStoreChange),
    [store, selector],
  );

  const getSnapshot = useCallback(() => selector(store.state), [store, selector]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Get request map or select a specific request.
 */
export function useRequest<S extends AnyStore>(store: S): InferStoreRequests<S>;
export function useRequest<S extends AnyStore, T>(store: S, selector: (requests: InferStoreRequests<S>) => T): T;
// eslint-disable-next-line react/no-unnecessary-use-prefix
export function useRequest<S extends AnyStore, T>(
  store: S,
  selector?: (requests: InferStoreRequests<S>) => T,
): InferStoreRequests<S> | T {
  const request = store.request as InferStoreRequests<S>;

  if (isUndefined(selector)) {
    return request;
  }

  return selector(request);
}

/**
 * Subscribe to task state changes.
 */
export function useTasks<S extends AnyStore>(store: S): TasksRecord<InferStoreTasks<S>> {
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
