import type { EnsureFunction } from '@videojs/utils/types';
import type { AnyStore, InferStoreRequests, InferStoreState } from '../../core/store';
import type { Task } from '../../core/task';
import type { OptimisticResult } from '../../shared/types';

import { useCallback, useReducer, useRef, useSyncExternalStore } from 'react';

import { subscribe, subscribeKeys } from '../../core/state';

/**
 * Track a store request with optimistic updates.
 *
 * Shows the optimistic value immediately while the request is pending,
 * then updates to the actual value on success or reverts on error.
 *
 * Returns a discriminated union — use `status` to narrow the type.
 *
 * @param store - The store instance containing the request
 * @param name - The request name to track (type-safe with autocomplete)
 * @param selector - Function to select the value from store state
 * @returns A discriminated union with the current optimistic state
 *
 * @example
 * ```tsx
 * function VolumeSlider() {
 *   const result = useOptimistic(store, 'setVolume', s => s.volume);
 *
 *   return (
 *     <input
 *       type="range"
 *       value={result.value}
 *       onChange={(e) => result.setValue(Number(e.target.value))}
 *       style={{ opacity: result.status === 'pending' ? 0.5 : 1 }}
 *     />
 *   );
 * }
 * ```
 */
export function useOptimistic<
  Store extends AnyStore,
  Name extends keyof InferStoreRequests<Store>,
  Value,
  Request extends InferStoreRequests<Store>[Name] = InferStoreRequests<Store>[Name],
>(
  store: Store,
  name: Name,
  selector: (state: InferStoreState<Store>) => Value,
): OptimisticResult<Value, (value: Value) => ReturnType<EnsureFunction<Request>>> {
  // Force update mechanism for optimistic value changes
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Track optimistic value (null = use actual state)
  const optimisticRef = useRef<Value | null>(null);
  const taskRef = useRef<Task | undefined>(store.queue.tasks[name]);

  // Version counter for detecting in-place mutations (useSyncExternalStore uses Object.is)
  const taskVersionRef = useRef(0);

  // Subscribe to store state for actual value
  const subscribeToState = useCallback((onStoreChange: () => void) => subscribe(store.state, onStoreChange), [store]);

  const getStateSnapshot = useCallback(() => selector(store.state), [store, selector]);

  const actualValue = useSyncExternalStore(subscribeToState, getStateSnapshot, getStateSnapshot);

  // Subscribe to task queue for status
  const subscribeToQueue = useCallback(
    (onStoreChange: () => void) =>
      subscribeKeys(store.queue.tasks, [name], () => {
        const newTask = store.queue.tasks[name];
        taskRef.current = newTask;
        taskVersionRef.current++; // Increment to signal change (handles in-place mutations)

        // Clear optimistic value when task settles
        if (optimisticRef.current !== null && newTask?.status !== 'pending') {
          optimisticRef.current = null;
        }

        onStoreChange();
      }),
    [store, name],
  );

  // Return version as snapshot so useSyncExternalStore detects in-place mutations
  const getQueueSnapshot = useCallback(() => taskVersionRef.current, []);

  // Subscribe triggers re-render via version change; read actual task from ref
  useSyncExternalStore(subscribeToQueue, getQueueSnapshot, getQueueSnapshot);
  const task = taskRef.current;

  // setValue: set optimistic value and call request
  const setValueRef = useRef((newValue: Value): ReturnType<EnsureFunction<Request>> => {
    optimisticRef.current = newValue;
    forceUpdate();

    const request = store.request[name] as (value: Value) => ReturnType<EnsureFunction<Request>>;
    return request(newValue);
  });

  // reset: clear optimistic value and reset task
  const resetRef = useRef(() => {
    optimisticRef.current = null;
    forceUpdate();

    taskRef.current = store.queue.tasks[name];
    if (taskRef.current) store.queue.reset(name);
  });

  // Build result with discriminated union
  const value = optimisticRef.current !== null ? optimisticRef.current : actualValue;
  const base = {
    value,
    setValue: setValueRef.current,
    reset: resetRef.current,
  };

  if (task?.status === 'error') {
    return {
      status: 'error',
      ...base,
      error: task.error,
    };
  }

  return {
    status: task?.status ?? 'idle',
    ...base,
  };
}

export namespace useOptimistic {
  export type Result<Value, SetValue> = OptimisticResult<Value, SetValue>;
}
