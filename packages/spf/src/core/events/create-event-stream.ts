/**
 * Minimal event stream with Observable-like shape.
 *
 * Simple Subject/Observable-like implementation for dispatching discrete events.
 * Events are dispatched synchronously to all subscribers.
 */

const EVENT_STREAM_SYMBOL = Symbol('@videojs/event-stream');

/**
 * Event listener function.
 */
export type EventListener<T extends Pick<Event, 'type'>> = (event: T) => void;

/**
 * Event stream interface.
 */
export interface EventStream<T extends Pick<Event, 'type'> = { type: string }> {
  [EVENT_STREAM_SYMBOL]: true;
  dispatch(event: T): void;
  subscribe(listener: EventListener<T>): () => void;
}

/**
 * Creates a minimal event stream for dispatching discrete events.
 *
 * Events are dispatched synchronously to all subscribers.
 * Conforms to Observable-like shape for future compatibility.
 *
 * Events must have a 'type' property for discriminated union type narrowing.
 *
 * @example
 * ```ts
 * type Action = { type: 'PLAY' } | { type: 'PAUSE' };
 * const events = createEventStream<Action>();
 *
 * events.subscribe((action) => {
 *   if (action.type === 'PLAY') {
 *     // Type narrowed to { type: 'PLAY' }
 *   }
 * });
 *
 * events.dispatch({ type: 'PLAY' });
 * ```
 */
export function createEventStream<T extends Pick<Event, 'type'>>(): EventStream<T> {
  const subscribers = new Set<EventListener<T>>();

  return {
    [EVENT_STREAM_SYMBOL]: true,

    dispatch(event: T): void {
      // Snapshot subscribers to avoid notifying those added during dispatch
      const current = Array.from(subscribers);
      for (const listener of current) {
        listener(event);
      }
    },

    subscribe(listener: EventListener<T>): () => void {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };
}

/**
 * Type guard to check if value is an EventStream.
 */
export function isEventStream(value: unknown): value is EventStream {
  return typeof value === 'object' && value !== null && EVENT_STREAM_SYMBOL in value;
}
