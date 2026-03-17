import { Signal } from 'signal-polyfill';

// Computeds waiting to re-run after their dependencies changed.
const pending = new Set<Signal.Computed<void>>();

const watcher = new Signal.subtle.Watcher(() => {
  // Scheduling decision: queueMicrotask mirrors the createState.patch() default.
  // If tests reveal ordering issues from removing flush() calls, switch to
  // synchronous execution here (call flush() directly instead of deferring).
  queueMicrotask(runPending);
});

function runPending() {
  for (const c of watcher.getPending()) {
    pending.add(c as Signal.Computed<void>);
  }
  watcher.watch(); // re-arm before running effects, in case they write signals
  for (const c of pending) {
    pending.delete(c);
    c.get(); // re-run the effect body
  }
}

/**
 * Run a side effect whenever its signal dependencies change.
 *
 * Executes immediately (synchronous initial run), then re-runs on the next
 * microtask after any dependency changes. Returns a cleanup function that
 * stops the effect.
 */
export function effect(fn: () => void): () => void {
  const c = new Signal.Computed(fn);
  watcher.watch(c);
  c.get(); // initial run
  return () => watcher.unwatch(c);
}
