import type { AnyStore, InferStoreRequests } from '../../core/store';

import { isUndefined } from '@videojs/utils/predicate';

/**
 * Access the store's request methods.
 *
 * Returns either the full request map or a selected request function.
 * The request map is stable across renders (same reference).
 *
 * @example
 * ```tsx
 * // Get all requests
 * function Controls() {
 *   const request = useRequest(store);
 *   return <button onClick={() => request.play()}>Play</button>;
 * }
 *
 * // Select a specific request
 * function PlayButton() {
 *   const play = useRequest(store, (r) => r.play);
 *   return <button onClick={() => play()}>Play</button>;
 * }
 * ```
 */
export function useRequest<S extends AnyStore>(store: S): InferStoreRequests<S>;
export function useRequest<S extends AnyStore, T>(store: S, selector: (requests: InferStoreRequests<S>) => T): T;
// eslint-disable-next-line react/no-unnecessary-use-prefix
export function useRequest<S extends AnyStore, T>(
  store: S,
  selector?: (requests: InferStoreRequests<S>) => T,
): InferStoreRequests<S> | T {
  const request = store.request as InferStoreRequests<S>;

  if (isUndefined(selector)) {
    return request;
  }

  return selector(request);
}
