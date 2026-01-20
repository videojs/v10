/**
 * Lifecycle status for async operations.
 *
 * - `'idle'` — Operation hasn't started yet
 * - `'pending'` — Operation is in flight
 * - `'success'` — Operation completed successfully
 * - `'error'` — Operation failed with an error
 */
export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';
