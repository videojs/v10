import type { TasksRecord } from '../../core/queue';
import type { AnyStore, InferStoreTasks } from '../../core/store';

import { useCallback, useRef, useSyncExternalStore } from 'react';

import { subscribe } from '../../core/state';

/**
 * Subscribe to task queue state.
 *
 * Returns a record of all tasks keyed by request name.
 * Re-renders when any task is added, updated, or removed.
 *
 * For tracking a single mutation, prefer `useMutation` which provides a more ergonomic API with
 * status helpers.
 *
 * @param store - The store instance to subscribe to
 * @returns Record of tasks keyed by request name
 *
 * @example
 * ```tsx
 * function TaskList() {
 *   const tasks = useTasks(store);
 *
 *   return (
 *     <ul>
 *       {Object.entries(tasks).map(([name, task]) => (
 *         <li key={name}>
 *           {name}: {task.status}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useTasks<S extends AnyStore>(store: S): TasksRecord<InferStoreTasks<S>> {
  const versionRef = useRef(0);

  const subscribeToQueue = useCallback(
    (onStoreChange: () => void) =>
      subscribe(store.queue.tasks, () => {
        versionRef.current++;
        onStoreChange();
      }),
    [store],
  );

  const getSnapshot = useCallback(() => versionRef.current, []);

  useSyncExternalStore(subscribeToQueue, getSnapshot, getSnapshot);

  // Return the tasks proxy directly
  return store.queue.tasks as TasksRecord<InferStoreTasks<S>>;
}
