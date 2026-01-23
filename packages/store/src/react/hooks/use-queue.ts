import { useSyncExternalStore } from 'react';
import type { Queue, TaskRecord, TasksRecord } from '../../core/queue';

/**
 * Subscribe to queue task changes.
 *
 * Returns the current tasks record and re-renders when tasks change.
 * This is the lower-level hook that takes a Queue directly.
 * For store-level access, use `useTasks(store)` instead.
 *
 * @example
 * ```tsx
 * function TaskList() {
 *   const tasks = useQueue(queue);
 *   return (
 *     <ul>
 *       {Object.entries(tasks).map(([name, task]) => (
 *         <li key={name}>{task.status}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useQueue<Tasks extends TaskRecord>(queue: Queue<Tasks>): TasksRecord<Tasks> {
  return useSyncExternalStore(
    (cb) => queue.subscribe(cb),
    () => queue.tasks,
    () => queue.tasks
  );
}

export namespace useQueue {
  export type Result<Tasks extends TaskRecord> = TasksRecord<Tasks>;
}
