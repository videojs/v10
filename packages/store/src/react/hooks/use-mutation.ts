import type { EnsureFunction } from '@videojs/utils/types';
import type { AnyStore, InferStoreRequests } from '../../core/store';
import type { Task } from '../../core/task';
import type { MutationResult } from '../../shared/types';

import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * Track a store request as a mutation with status, data, and error.
 *
 * Subscribes to the task queue and re-renders when the mutation's status changes.
 *
 * Returns a discriminated union — use `status` to narrow the type and access
 * `data` (on success) or `error` (on failure).
 *
 * @param store - The store instance containing the request
 * @param name - The request name to track (type-safe with autocomplete)
 * @returns A discriminated union with the mutation's current state
 *
 * @example
 * ```tsx
 * function SourceSelector() {
 *   const source = useMutation(store, 'setSource');
 *
 *   return (
 *     <>
 *       <select
 *         onChange={(e) => source.mutate({ src: e.target.value, type: 'video/mp4' })}
 *         disabled={source.status === 'pending'}
 *       >
 *         <option value="/videos/720p.mp4">720p</option>
 *         <option value="/videos/1080p.mp4">1080p</option>
 *       </select>
 *       {source.status === 'error' && (
 *         <p className="error">Failed to load: {String(source.error)}</p>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useMutation<
  Store extends AnyStore,
  Name extends keyof InferStoreRequests<Store>,
  Mutate extends InferStoreRequests<Store>[Name] = InferStoreRequests<Store>[Name],
>(store: Store, name: Name): MutationResult<Mutate, Awaited<ReturnType<EnsureFunction<Mutate>>>> {
  type Data = Awaited<ReturnType<EnsureFunction<Mutate>>>;

  const taskRef = useRef<Task | undefined>(store.queue.tasks[name]);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store.queue.subscribe((tasks) => {
        const newTask = tasks[name];
        if (newTask !== taskRef.current) {
          taskRef.current = newTask;
          onStoreChange();
        }
      }),
    [store, name],
  );

  const getSnapshot = useCallback(() => taskRef.current, []);

  const task = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const resetRef = useRef(() => store.queue.reset(name));

  const base = {
    mutate: store.request[name] as Mutate,
    reset: resetRef.current,
  };

  if (task?.status === 'success') {
    return {
      status: 'success',
      ...base,
      data: task.output as Data,
    };
  }

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
  } as MutationResult<Mutate, Data>;
}

export namespace useMutation {
  export type Result<Mutate, Data> = MutationResult<Mutate, Data>;
}
