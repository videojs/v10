import { peek, type ReadonlySignal } from '../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../media/types';
import type { FetchOptions, Resource } from '../../network/fetch';

/**
 * State a credentials-decorated fetch reads.
 *
 * `requestCredentials` is an adapter-driven input slot the engine materializes through `shareSignals`, so it is
 * _optional_ here: a behavior's narrow state is assignable without declaring it, and a composition that never sets it
 * fetches with the platform default (`same-origin`). `presentation` — which every fetching behavior already declares —
 * anchors the type so that assignability holds without a weak-type escape. Same contract as `failedCdns` /
 * `failoverFetch`.
 */
export interface RequestCredentialsState {
  presentation: ReadonlySignal<MaybeResolvedPresentation | undefined>;
  requestCredentials?: ReadonlySignal<RequestCredentials | undefined>;
}

/** Any `Resource`-addressable fetch — `fetchResolvable`, `FetchText`, and `FetchBytes` all qualify. */
type CredentialableFetch = (addressable: Resource, options?: FetchOptions) => Promise<unknown>;

/**
 * Decorate a fetch so every request carries `state.requestCredentials` as its `credentials` mode. The decorated fetch's
 * type is preserved, so this wraps the manifest, playlist, and segment fetches alike.
 *
 * The slot is read per request (untracked), not at decoration time: it mirrors the media element's `crossorigin`
 * attribute, which an author can change after the fetch was built. An explicit per-call `credentials` still wins, and
 * an unset slot leaves the options untouched so the platform default applies.
 */
export function credentialsFetch<Fetch extends CredentialableFetch>(
  baseFetch: Fetch,
  state: RequestCredentialsState
): Fetch {
  return ((addressable: Resource, options?: FetchOptions) => {
    const credentials = state.requestCredentials ? peek(state.requestCredentials) : undefined;
    if (credentials === undefined) return baseFetch(addressable, options);

    return baseFetch(addressable, { credentials, ...options });
  }) as Fetch;
}
