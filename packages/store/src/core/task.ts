import type { RequestMeta } from './request';

// ----------------------------------------
// Types
// ----------------------------------------

export type TaskKey<T = string | symbol> = T & (string | symbol);

export type EnsureTaskKey<T> = T extends string | symbol ? T : never;

export interface TaskBase<Key extends TaskKey = TaskKey, Input = unknown> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  startedAt: number;
  meta: RequestMeta | null;
}

export interface PendingTask<Key extends TaskKey = TaskKey, Input = unknown> extends TaskBase<Key, Input> {
  status: 'pending';
  abort: AbortController;
}

export interface SuccessTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown>
  extends TaskBase<Key, Input> {
  status: 'success';
  settledAt: number;
  output: Output;
}

export interface ErrorTask<Key extends TaskKey = TaskKey, Input = unknown> extends TaskBase<Key, Input> {
  status: 'error';
  settledAt: number;
  error: unknown;
  cancelled: boolean;
}

export type Task<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> =
  | PendingTask<Key, Input>
  | SuccessTask<Key, Input, Output>
  | ErrorTask<Key, Input>;

export type SettledTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> =
  | SuccessTask<Key, Input, Output>
  | ErrorTask<Key, Input>;

export interface TaskContext<Input = unknown> {
  input: Input;
  signal: AbortSignal;
}

// ----------------------------------------
// Type Guards
// ----------------------------------------

/** Check if task is pending (in-flight). */
export function isPendingTask<K extends TaskKey, I, O>(task: Task<K, I, O> | undefined): task is PendingTask<K, I> {
  return task?.status === 'pending';
}

/** Check if task is settled (success or error). */
export function isSettledTask<K extends TaskKey, I, O>(task: Task<K, I, O> | undefined): task is SettledTask<K, I, O> {
  return task?.status === 'success' || task?.status === 'error';
}

/** Check if task is a success. */
export function isSuccessTask<K extends TaskKey, I, O>(task: Task<K, I, O> | undefined): task is SuccessTask<K, I, O> {
  return task?.status === 'success';
}

/** Check if task is an error. */
export function isErrorTask<K extends TaskKey, I>(task: Task<K, I> | undefined): task is ErrorTask<K, I> {
  return task?.status === 'error';
}
