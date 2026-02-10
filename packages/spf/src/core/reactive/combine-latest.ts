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
 * Combines multiple Observable sources into a single Observable.
 *
 * Emits an array of latest values whenever any source emits.
 * Only emits after all sources have emitted at least once.
 *
 * @param sources - Array of Observable sources
 * @returns Combined Observable
 *
 * @example
 * ```ts
 * const state = createState({ count: 0 });
 * const events = createEventStream<Action>();
 *
 * const combined = combineLatest([state, events]);
 *
 * combined.subscribe(([state, event]) => {
 *   if (event.type === 'PLAY' && state.count > 0) {
 *     // React to event + state condition
 *   }
 * });
 * ```
 */
export function combineLatest<T extends readonly Observable<unknown>[]>(
  sources: [...T]
): Observable<InferObservableValues<T>> {
  type Values = InferObservableValues<T>;

  return {
    subscribe(listener: (values: Values) => void): () => void {
      const latest: unknown[] = new Array(sources.length);
      const hasValue: boolean[] = new Array(sources.length).fill(false);
      const unsubscribers: Array<() => void> = [];

      // Subscribe to each source
      for (let i = 0; i < sources.length; i++) {
        const unsubscribe = sources[i]!.subscribe((value) => {
          // Store latest value
          latest[i] = value;
          hasValue[i] = true;

          // Only emit if all sources have emitted
          if (hasValue.every((has) => has)) {
            listener([...latest] as Values);
          }
        });

        unsubscribers.push(unsubscribe);
      }

      // Return cleanup function that unsubscribes from all sources
      return () => {
        for (const unsubscribe of unsubscribers) {
          unsubscribe();
        }
      };
    },
  };
}
