export interface OnEventOptions extends AddEventListenerOptions {
  /**
   * An AbortSignal to cancel waiting for the event.
   *
   * If aborted, the returned promise will reject with an `AbortError`.
   */
  signal?: AbortSignal;
}

/**
 * Wait for an event to occur on a target.
 *
 * @param target - The event target (HTMLMediaElement)
 * @param type - The event type to wait for
 * @param options - Optional event options including AbortSignal
 * @returns A promise that resolves with the event
 */
export function onEvent<K extends keyof HTMLMediaElementEventMap>(
  target: HTMLMediaElement,
  type: K,
  options?: OnEventOptions,
): Promise<HTMLMediaElementEventMap[K]>;

/**
 * Wait for an event to occur on a target.
 *
 * @param target - The event target (HTMLElement)
 * @param type - The event type to wait for
 * @param options - Optional event options including AbortSignal
 * @returns A promise that resolves with the event
 */
export function onEvent<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  options?: OnEventOptions,
): Promise<HTMLElementEventMap[K]>;

/**
 * Wait for an event to occur on a target.
 *
 * @param target - The event target (Window)
 * @param type - The event type to wait for
 * @param options - Optional event options including AbortSignal
 * @returns A promise that resolves with the event
 */
export function onEvent<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  options?: OnEventOptions,
): Promise<WindowEventMap[K]>;

/**
 * Wait for an event to occur on a target.
 *
 * @param target - The event target (Document)
 * @param type - The event type to wait for
 * @param options - Optional event options including AbortSignal
 * @returns A promise that resolves with the event
 */
export function onEvent<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  options?: OnEventOptions,
): Promise<DocumentEventMap[K]>;

/**
 * Wait for an event to occur on a target.
 *
 * @param target - The event target
 * @param type - The event type to wait for
 * @param options - Optional event options including AbortSignal
 * @returns A promise that resolves with the event
 *
 * @example
 * ```ts
 * // Wait for video to be seeked
 * const event = await onEvent(video, 'seeked');
 * ```
 *
 * @example
 * ```ts
 * // With AbortSignal for cancellation
 * const controller = new AbortController();
 *
 * try {
 *   const event = await onEvent(video, 'seeked', { signal: controller.signal });
 * } catch (e) {
 *   if (e.name === 'AbortError') {
 *     console.log('Cancelled waiting for event');
 *   }
 * }
 *
 * // Cancel from elsewhere
 * controller.abort();
 * ```
 */
export function onEvent(target: EventTarget, type: string, options?: OnEventOptions): Promise<Event>;

export function onEvent(target: EventTarget, type: string, options?: OnEventOptions): Promise<Event> {
  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      reject(options?.signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    // If already aborted, reject immediately
    if (options?.signal?.aborted) {
      handleAbort();
      return;
    }

    // Listen for abort
    options?.signal?.addEventListener('abort', handleAbort, { once: true });

    // Listen for the event
    target.addEventListener(
      type,
      (event) => {
        options?.signal?.removeEventListener('abort', handleAbort);
        resolve(event);
      },
      { ...options, once: true },
    );
  });
}
