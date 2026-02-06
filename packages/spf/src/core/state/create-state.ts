/**
 * Reactive state container with selectors, custom equality, and batched updates.
 *
 * Manages both immutable state values and mutable object references (e.g., HTMLMediaElement).
 */

// =============================================================================
// Symbol for type identification
// =============================================================================

const STATE_SYMBOL = Symbol('@videojs/spf/state');

// =============================================================================
// Types
// =============================================================================

/**
 * State change listener for full-state subscriptions.
 */
export type StateListener<T> = (current: T) => void;

/**
 * Selector function to derive a value from state.
 */
export type StateSelector<T, R> = (state: T) => R;

/**
 * Listener for selector-based subscriptions.
 */
export type SelectorListener<R> = (current: R) => void;

/**
 * Options for selector subscriptions.
 */
export interface SelectorOptions<R> {
  /**
   * Custom equality function for selected value.
   * Defaults to Object.is
   */
  equalityFn?: (a: R, b: R) => boolean;
}

/**
 * Configuration for creating a state container.
 */
export interface StateConfig<T> {
  /**
   * Custom equality function for change detection.
   * Defaults to Object.is for top-level comparison.
   */
  equalityFn?: (a: T, b: T) => boolean;
}

/**
 * Read-only state interface.
 */
export interface State<T> {
  /** Symbol for type identification */
  readonly [STATE_SYMBOL]: true;

  /** Current state snapshot */
  readonly current: T;

  /** Subscribe to state changes */
  subscribe(listener: StateListener<T>): () => void;
}

/**
 * Writable state interface with patch capability.
 */
export interface WritableState<T> extends State<T> {
  /** Update state with partial object */
  patch(partial: Partial<T>): void;

  /** Subscribe to full-state changes */
  subscribe(listener: StateListener<T>): () => void;

  /** Subscribe to selected value changes */
  subscribe<R>(selector: StateSelector<T, R>, listener: SelectorListener<R>, options?: SelectorOptions<R>): () => void;

  /** Manually flush pending updates */
  flush(): void;
}

/**
 * Entry for selector subscriptions.
 */
interface SelectorEntry<T, R> {
  selector: StateSelector<T, R>;
  listener: SelectorListener<R>;
  options: SelectorOptions<R>;
}

// =============================================================================
// Default equality function
// =============================================================================

/**
 * Default equality function using Object.is.
 */
function defaultEquality<T>(a: T, b: T): boolean {
  return Object.is(a, b);
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * State container implementation.
 */
class StateContainer<T> implements WritableState<T> {
  [STATE_SYMBOL] = true as const;

  #current: T;
  #pending: T | null = null;
  #pendingFlush = false;
  #equalityFn: (a: T, b: T) => boolean;

  // Full-state listeners
  #listeners = new Set<StateListener<T>>();

  // Selector-based listeners
  #selectorListeners = new Set<SelectorEntry<T, unknown>>();

  constructor(initial: T, config?: StateConfig<T>) {
    this.#current = { ...initial };
    this.#equalityFn = config?.equalityFn ?? defaultEquality;
  }

  get current(): T {
    // Return pending state if available (for chained patches)
    return this.#pending ?? this.#current;
  }

  patch(partial: Partial<T>): void {
    const base = this.#pending ?? this.#current;
    const next = { ...base };

    let changed = false;

    // Apply partial updates with change detection
    for (const key in partial) {
      if (!Object.hasOwn(partial, key)) continue;

      const value = partial[key];

      if (!Object.is(base[key], value)) {
        next[key] = value!;
        changed = true;
      }
    }

    if (changed) {
      this.#pending = next;
      this.#scheduleFlush();
    }
  }

  subscribe(listener: StateListener<T>): () => void;
  subscribe<R>(selector: StateSelector<T, R>, listener: SelectorListener<R>, options?: SelectorOptions<R>): () => void;
  subscribe<R>(
    selectorOrListener: StateListener<T> | StateSelector<T, R>,
    maybeListener?: SelectorListener<R>,
    options?: SelectorOptions<R>
  ): () => void {
    // Overload 1: Full-state subscription
    if (maybeListener === undefined) {
      const listener = selectorOrListener as StateListener<T>;
      this.#listeners.add(listener);

      // Fire immediately with current state
      listener(this.current);

      return () => {
        this.#listeners.delete(listener);
      };
    }

    // Overload 2: Selector subscription
    const selector = selectorOrListener as StateSelector<T, R>;
    const listener = maybeListener;
    const opts = options ?? {};

    const entry: SelectorEntry<T, unknown> = {
      selector: selector as StateSelector<T, unknown>,
      listener: listener as SelectorListener<unknown>,
      options: opts as SelectorOptions<unknown>,
    };

    this.#selectorListeners.add(entry);

    // Fire immediately with current selected value
    const selected = selector(this.current);
    listener(selected);

    return () => {
      this.#selectorListeners.delete(entry);
    };
  }

  flush(): void {
    if (this.#pending === null) return;

    const prev = this.#current;
    const next = this.#pending;
    this.#pending = null;
    this.#pendingFlush = false;

    // Check if state actually changed using custom equality
    if (this.#equalityFn(prev, next)) return;

    this.#current = next;

    // Notify full-state listeners
    for (const listener of this.#listeners) {
      listener(this.#current);
    }

    // Notify selector listeners
    for (const entry of this.#selectorListeners) {
      const prevSelected = entry.selector(prev);
      const nextSelected = entry.selector(this.#current);

      const equalityFn = entry.options.equalityFn ?? Object.is;

      if (!equalityFn(prevSelected, nextSelected)) {
        entry.listener(nextSelected);
      }
    }
  }

  #scheduleFlush(): void {
    if (this.#pendingFlush) return;
    this.#pendingFlush = true;
    queueMicrotask(() => this.flush());
  }
}

// =============================================================================
// Factory function
// =============================================================================

/**
 * Create a reactive state container.
 *
 * @example
 * ```typescript
 * const state = createState({ count: 0 });
 *
 * // Subscribe to changes
 * state.subscribe((current, prev) => {
 *   console.log('Changed:', prev, '->', current);
 * });
 *
 * // Updates are batched
 * state.patch({ count: 1 });
 * state.patch({ count: 2 });
 * // Only one notification fires (with count: 2)
 * ```
 *
 * @example Selector subscriptions
 * ```typescript
 * const state = createState({ count: 0, name: 'test' });
 *
 * // Only notified when count changes
 * state.subscribe(
 *   s => s.count,
 *   (current, prev) => console.log(current, prev)
 * );
 * ```
 *
 * @example Custom equality
 * ```typescript
 * const state = createState(
 *   { count: 0, name: 'test' },
 *   { equalityFn: (a, b) => a.count === b.count }
 * );
 * ```
 */
export function createState<T>(initial: T, config?: StateConfig<T>): WritableState<T> {
  return new StateContainer(initial, config);
}

// =============================================================================
// Type guard
// =============================================================================

/**
 * Check if a value is a State container.
 */
export function isState(value: unknown): value is State<object> {
  return typeof value === 'object' && value !== null && STATE_SYMBOL in value;
}
