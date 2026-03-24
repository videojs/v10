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
 * microtask after any dependency changes. If the callback returns a function,
 * it is called before each re-run and when the effect is stopped — the same
 * cleanup contract as Preact Signals, Maverick Signals, and Svelte 5 $effect.
 *
 * Returns a cleanup function that stops the effect.
 */
export function effect(fn: () => (() => void) | void): () => void {
  let cleanup: (() => void) | void;
  const c = new Signal.Computed(() => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = fn();
  });
  watcher.watch(c);
  c.get(); // initial run
  return () => {
    watcher.unwatch(c);
    if (typeof cleanup === 'function') cleanup();
  };
}
