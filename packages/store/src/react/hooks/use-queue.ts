import { useSyncExternalStore } from 'react';
import type { TasksRecord } from '../../core/queue';
import type { AnyStore, InferStoreTasks } from '../../core/store';

/**
 * Subscribe to queue task changes.
 *
 * Returns a record of all tasks keyed by request name.
 * Re-renders when any task is added, updated, or removed.
 *
 * @example
 * ```tsx
 * function TaskStatus() {
 *   const tasks = useQueue(store);
 *   const playTask = tasks.play;
 *
 *   if (playTask?.status === 'pending') {
 *     return <span>Loading...</span>;
 *   }
 *
 *   return <span>Ready</span>;
 * }
 * ```
 */
export function useQueue<Store extends AnyStore>(store: Store): TasksRecord<InferStoreTasks<Store>> {
  return useSyncExternalStore(
    (cb) => store.queue.subscribe(cb),
    () => store.queue.tasks as TasksRecord<InferStoreTasks<Store>>,
    () => store.queue.tasks as TasksRecord<InferStoreTasks<Store>>
  );
}

export namespace useQueue {
  export type Result<Store extends AnyStore> = TasksRecord<InferStoreTasks<Store>>;
}
