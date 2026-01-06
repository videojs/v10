// ----------------------------------------
// Async Status
// ----------------------------------------

/**
 * Lifecycle status for async operations.
 *
 * - `'idle'` — Operation hasn't started yet
 * - `'pending'` — Operation is in flight
 * - `'success'` — Operation completed successfully
 * - `'error'` — Operation failed with an error
 */
export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';

// ----------------------------------------
// Mutation Types
// ----------------------------------------

/**
 * Common properties shared by all mutation states.
 */
interface MutationBase<Mutate> {
  status: AsyncStatus;
  mutate: Mutate;
  reset: () => void;
}

/**
 * Mutation hasn't been triggered yet.
 * This is the initial state before calling `mutate()`.
 */
export interface MutationIdle<Mutate> extends MutationBase<Mutate> {
  status: 'idle';
}

/**
 * Mutation is in flight, waiting for the request to complete.
 * The UI should typically show a loading indicator.
 */
export interface MutationPending<Mutate> extends MutationBase<Mutate> {
  status: 'pending';
}

/**
 * Mutation completed successfully.
 * The `data` property contains the request's return value.
 */
export interface MutationSuccess<Mutate, Data> extends MutationBase<Mutate> {
  status: 'success';
  data: Data;
}

/**
 * Mutation failed with an error.
 * The `error` property contains the thrown exception.
 */
export interface MutationError<Mutate> extends MutationBase<Mutate> {
  status: 'error';
  error: unknown;
}

/**
 * Discriminated union representing all possible mutation states.
 *
 * Use `status` to narrow the type and access state-specific properties:
 *
 * ```ts
 * if (mutation.status === 'success') {
 *   console.log(mutation.data); // Data is available
 * }
 * if (mutation.status === 'error') {
 *   console.log(mutation.error); // Error is available
 * }
 * ```
 */
export type MutationResult<Mutate, Data>
  = | MutationIdle<Mutate>
    | MutationPending<Mutate>
    | MutationSuccess<Mutate, Data>
    | MutationError<Mutate>;

// ----------------------------------------
// Optimistic Types
// ----------------------------------------

/**
 * Common properties shared by all optimistic states.
 */
interface OptimisticBase<Value, SetValue> {
  value: Value;
  setValue: SetValue;
  reset: () => void;
}

/**
 * No optimistic update is active.
 * The `value` reflects the actual store state.
 */
export interface OptimisticIdle<Value, SetValue> extends OptimisticBase<Value, SetValue> {
  status: 'idle';
}

/**
 * An optimistic update is in flight.
 * The `value` shows the optimistic (predicted) value while waiting.
 */
export interface OptimisticPending<Value, SetValue> extends OptimisticBase<Value, SetValue> {
  status: 'pending';
}

/**
 * The optimistic update completed successfully.
 * The `value` now reflects the confirmed store state.
 */
export interface OptimisticSuccess<Value, SetValue> extends OptimisticBase<Value, SetValue> {
  status: 'success';
}

/**
 * The optimistic update failed.
 * The `value` has reverted to the actual store state.
 * The `error` property contains the thrown exception.
 */
export interface OptimisticError<Value, SetValue> extends OptimisticBase<Value, SetValue> {
  status: 'error';
  error: unknown;
}

/**
 * Discriminated union representing all possible optimistic update states.
 *
 * Use `status` to narrow the type and access state-specific properties:
 *
 * ```ts
 * if (optimistic.status === 'error') {
 *   console.log(optimistic.error); // Error is available
 * }
 * ```
 */
export type OptimisticResult<Value, SetValue>
  = | OptimisticIdle<Value, SetValue>
    | OptimisticPending<Value, SetValue>
    | OptimisticSuccess<Value, SetValue>
    | OptimisticError<Value, SetValue>;
