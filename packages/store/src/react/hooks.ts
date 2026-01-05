import type { Task, TasksRecord } from '../core/queue';
import type { AnyStore, InferStoreRequests, InferStoreState, InferStoreTasks } from '../core/store';

import { isUndefined } from '@videojs/utils/predicate';

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

/**
 * Subscribe to selected state. Re-renders only when selected value changes.
 */
export function useSelector<S extends AnyStore, T>(store: S, selector: (state: InferStoreState<S>) => T): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(selector, onStoreChange),
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

// ----------------------------------------
// Mutation Types
// ----------------------------------------

/**
 * Status of a mutation.
 */
export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Result returned by `useMutation`.
 */
export interface MutationResult<Mutate extends (...args: any[]) => any> {
  /** The mutation function to call. */
  mutate: Mutate;
  /** Current status of the mutation. */
  status: MutationStatus;
  /** True if the mutation is currently pending. */
  isPending: boolean;
  /** True if the mutation completed successfully. */
  isSuccess: boolean;
  /** True if the mutation failed. */
  isError: boolean;
  /** The result data if mutation was successful. */
  data: Awaited<ReturnType<Mutate>> | undefined;
  /** The error if mutation failed. */
  error: unknown;
  /** Clears the settled state (data/error) for this mutation. */
  reset: () => void;
}

// ----------------------------------------
// useMutation
// ----------------------------------------

/**
 * Returns a mutation function with status tracking.
 *
 * Subscribes to the queue to track the status of the selected request.
 * Re-renders when the task status changes (pending, success, error).
 *
 * @param store - The store instance
 * @param selector - Function to select a request (e.g., `r => r.play`)
 * @returns Mutation result with mutate function and status
 *
 * @example
 * ```tsx
 * const { mutate: play, isPending, isError, error } = useMutation(store, r => r.play);
 *
 * return (
 *   <button onClick={() => play()} disabled={isPending}>
 *     {isPending ? 'Loading...' : 'Play'}
 *   </button>
 * );
 * ```
 */
export function useMutation<
  S extends AnyStore,
  Selector extends (requests: InferStoreRequests<S>) => (...args: any[]) => any,
>(store: S, selector: Selector): MutationResult<ReturnType<Selector>> {
  type Mutate = ReturnType<Selector>;
  type Output = Awaited<ReturnType<Mutate>>;

  // Extract the request key by inspecting what property the selector accesses
  const requestKey = useMemo(() => {
    const requests = store.request as InferStoreRequests<S>;
    let capturedKey: string | undefined;

    // Create a proxy to capture which property is accessed
    const proxy = new Proxy(requests as object, {
      get(_target, prop) {
        if (typeof prop === 'string') {
          capturedKey = prop;
        }
        return (requests as Record<string | symbol, unknown>)[prop];
      },
    });

    selector(proxy as InferStoreRequests<S>);

    if (!capturedKey) {
      throw new Error('useMutation: selector must access a request property');
    }

    return capturedKey;
  }, [store, selector]);

  // Get the mutate function - cast is safe because selector returns the request function
  const mutate = useMemo(() => selector(store.request as InferStoreRequests<S>) as Mutate, [store, selector]);

  // Track the task for this request key
  const taskRef = useRef<Task | undefined>(store.queue.tasks[requestKey]);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store.queue.subscribe((tasks) => {
        const newTask = tasks[requestKey];
        // Only trigger update if the task changed
        if (newTask !== taskRef.current) {
          taskRef.current = newTask;
          onStoreChange();
        }
      }),
    [store, requestKey],
  );

  const getSnapshot = useCallback(() => taskRef.current, []);

  const task = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Derive status from task
  const status: MutationStatus = isUndefined(task) ? 'idle' : task.status;
  const isPending = status === 'pending';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  // Extract data/error based on status
  const data: Output | undefined = isSuccess && task?.status === 'success' ? (task.output as Output) : undefined;
  const error: unknown = isError && task?.status === 'error' ? task.error : undefined;

  // Reset function to clear settled state
  const reset = useCallback(() => {
    store.queue.reset(requestKey);
  }, [store, requestKey]);

  return useMemo(
    () => ({
      mutate,
      status,
      isPending,
      isSuccess,
      isError,
      data,
      error,
      reset,
    }),
    [mutate, status, isPending, isSuccess, isError, data, error, reset],
  );
}
