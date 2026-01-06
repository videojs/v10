import type { TasksRecord } from '../../core/queue';
import type { AnyStore, InferStoreTasks } from '../../core/store';

import { useCallback, useRef, useSyncExternalStore } from 'react';

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
