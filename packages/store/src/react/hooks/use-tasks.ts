import { useSyncExternalStore } from 'react';
import type { TasksRecord } from '../../core/queue';
import type { AnyStore, InferStoreTasks } from '../../core/store';

/**
 * Subscribe to task queue state.
 *
 * Returns a record of all tasks keyed by request name.
 * Re-renders when any task is added, updated, or removed.
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
export function useTasks<Store extends AnyStore>(store: Store): TasksRecord<InferStoreTasks<Store>> {
  return useSyncExternalStore(
    (cb) => store.queue.subscribe(cb),
    () => store.queue.tasks as TasksRecord<InferStoreTasks<Store>>,
    () => store.queue.tasks as TasksRecord<InferStoreTasks<Store>>
  );
}
