import { isUndefined } from '@videojs/utils/predicate';
import type { AnyStore, InferStoreRequests } from '../../core/store';

/**
 * Access the store's request methods.
 *
 * Returns either the full request map or a specific request function by name.
 *
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
 * // Get a specific request by name
 * function PlayButton() {
 *   const play = useRequest(store, 'play');
 *   return <button onClick={() => play()}>Play</button>;
 * }
 * ```
 */
export function useRequest<S extends AnyStore>(store: S): InferStoreRequests<S>;
export function useRequest<S extends AnyStore, Name extends keyof InferStoreRequests<S>>(
  store: S,
  name: Name
): InferStoreRequests<S>[Name];
export function useRequest<S extends AnyStore, Name extends keyof InferStoreRequests<S>>(
  store: S,
  name?: Name
): InferStoreRequests<S> | InferStoreRequests<S>[Name] {
  const request = store.request as InferStoreRequests<S>;

  if (isUndefined(name)) {
    return request;
  }

  return request[name];
}
