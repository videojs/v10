/**
 * Minimal combineLatest operator for reactive composition.
 *
 * Combines multiple Observable-like sources and emits an array of their latest values
 * whenever any source emits.
 */

/**
 * Observable-like interface.
 * Both State and EventStream conform to this shape.
 */
export interface Observable<T> {
  subscribe(listener: (value: T) => void): () => void;
}

/**
 * Infer value types from array of Observables.
 */
export type InferObservableValues<T extends readonly Observable<unknown>[]> = {
  [K in keyof T]: T[K] extends Observable<infer V> ? V : never;
};

/**
 * Options for selector-based subscriptions on a combined observable.
 */
export interface SelectorOptions<R> {
  equalityFn?: (a: R, b: R) => boolean;
}

/**
 * Observable returned by combineLatest — supports both plain and
 * selector-based subscriptions.
 */
export interface CombinedObservable<T> extends Observable<T> {
  subscribe(listener: (value: T) => void): () => void;
  subscribe<R>(selector: (value: T) => R, listener: (value: R) => void, options?: SelectorOptions<R>): () => void;
}

/**
 * Combines multiple Observable sources into a single Observable.
 *
 * Emits an array of latest values whenever any source emits.
 * Only emits after all sources have emitted at least once.
 *
 * Supports selector-based subscriptions (fires only when the selected value
 * changes, per the optional equalityFn) mirroring the createState API.
 *
 * @param sources - Array of Observable sources
 * @returns Combined Observable
 *
 * @example
 * ```ts
 * const state = createState({ count: 0 });
 * const events = createEventStream<Action>();
 *
 * combineLatest([state, events]).subscribe(([state, event]) => {
 *   if (event.type === 'PLAY' && state.count > 0) {
 *     // React to event + state condition
 *   }
 * });
 * ```
 *
 * @example Selector subscription
 * ```ts
 * combineLatest([state, owners]).subscribe(
 *   ([s, o]) => deriveKey(s, o),
 *   (key) => { ... },
 *   { equalityFn: keyEq }
 * );
 * ```
 */
export function combineLatest<T extends readonly Observable<unknown>[]>(
  sources: [...T]
): CombinedObservable<InferObservableValues<T>> {
  type Values = InferObservableValues<T>;

  const subscribeToSources = (listener: (values: Values) => void): (() => void) => {
    const latest: unknown[] = new Array(sources.length);
    const hasValue: boolean[] = new Array(sources.length).fill(false);
    const unsubscribers: Array<() => void> = [];

    for (let i = 0; i < sources.length; i++) {
      const unsubscribe = sources[i]!.subscribe((value) => {
        latest[i] = value;
        hasValue[i] = true;
        if (hasValue.every((has) => has)) {
          listener([...latest] as Values);
        }
      });
      unsubscribers.push(unsubscribe);
    }

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  };

  return {
    subscribe<R>(
      listenerOrSelector: ((values: Values) => void) | ((values: Values) => R),
      maybeListener?: (value: R) => void,
      options?: SelectorOptions<R>
    ): () => void {
      if (maybeListener === undefined) {
        return subscribeToSources(listenerOrSelector as (values: Values) => void);
      }

      const selector = listenerOrSelector as (values: Values) => R;
      const listener = maybeListener;
      const equalityFn = options?.equalityFn ?? Object.is;

      let prevSelected: R | undefined;
      let initialized = false;

      return subscribeToSources((values) => {
        const nextSelected = selector(values);
        if (!initialized || !equalityFn(prevSelected as R, nextSelected)) {
          prevSelected = nextSelected;
          initialized = true;
          listener(nextSelected);
        }
      });
    },
  };
}
