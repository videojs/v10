/**
 * Add an event listener and return a cleanup function to remove it.
 *
 * @param target - The event target (HTMLMediaElement)
 * @param type - The event type
 * @param listener - The event listener
 * @param options - Optional event listener options
 * @returns A cleanup function that removes the event listener
 */
export function listen<K extends keyof HTMLMediaElementEventMap>(
  target: HTMLMediaElement,
  type: K,
  listener: (event: HTMLMediaElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;

/**
 * Add an event listener and return a cleanup function to remove it.
 *
 * @param target - The event target (HTMLElement)
 * @param type - The event type
 * @param listener - The event listener
 * @param options - Optional event listener options
 * @returns A cleanup function that removes the event listener
 */
export function listen<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;

/**
 * Add an event listener and return a cleanup function to remove it.
 *
 * @param target - The event target (Window)
 * @param type - The event type
 * @param listener - The event listener
 * @param options - Optional event listener options
 * @returns A cleanup function that removes the event listener
 */
export function listen<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;

/**
 * Add an event listener and return a cleanup function to remove it.
 *
 * @param target - The event target (Document)
 * @param type - The event type
 * @param listener - The event listener
 * @param options - Optional event listener options
 * @returns A cleanup function that removes the event listener
 */
export function listen<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;

/**
 * Add an event listener and return a cleanup function to remove it.
 *
 * @param target - The event target
 * @param type - The event type
 * @param listener - The event listener
 * @param options - Optional event listener options
 * @returns A cleanup function that removes the event listener
 *
 * @example
 * ```ts
 * const cleanup = listen(video, 'play', () => console.log('playing'));
 *
 * // Later, remove the listener
 * cleanup();
 * ```
 *
 * @example
 * ```ts
 * // With options
 * const cleanup = listen(video, 'play', handler, { once: true, passive: true });
 * ```
 *
 * @example
 * ```ts
 * // With AbortSignal (native browser support)
 * const controller = new AbortController();
 * listen(video, 'play', handler, { signal: controller.signal });
 *
 * // Later, abort to remove the listener
 * controller.abort();
 * ```
 */
export function listen(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): () => void;

export function listen(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
}
