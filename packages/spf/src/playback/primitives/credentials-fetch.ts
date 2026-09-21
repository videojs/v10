import { isFunction } from '@videojs/utils/predicate';

import type { FetchOptions, Resource } from '../../network/fetch';

/**
 * The `credentials` mode the engine's requests are made with: a fixed mode, or a policy consulted per request that may
 * read live state (the media adapter supplies one reading its `crossOrigin`) or decide per resource (only for one CDN
 * host, say). `undefined` from either leaves the platform default (`same-origin`).
 */
export type RequestCredentialsPolicy = RequestCredentials | ((resource: Resource) => RequestCredentials | undefined);

/** Any `Resource`-addressable fetch — `fetchResolvable`, `FetchText`, and `FetchBytes` all qualify. */
type CredentialableFetch = (addressable: Resource, options?: FetchOptions) => Promise<unknown>;

/**
 * Decorate a fetch so every request carries the mode the policy resolves to. The decorated fetch's type is preserved,
 * so this wraps the manifest, playlist, and segment fetches alike; with no policy the fetch is returned as is.
 *
 * The policy runs per request rather than once at decoration: it mirrors the media element's `crossorigin` attribute,
 * which an author can change after the fetch was built. An explicit per-call `credentials` still wins.
 */
export function credentialsFetch<Fetch extends CredentialableFetch>(
  baseFetch: Fetch,
  policy: RequestCredentialsPolicy | undefined
): Fetch {
  if (policy === undefined) return baseFetch;

  return ((addressable: Resource, options?: FetchOptions) => {
    const credentials = isFunction(policy) ? policy(addressable) : policy;
    if (credentials === undefined) return baseFetch(addressable, options);

    return baseFetch(addressable, { credentials, ...options });
  }) as Fetch;
}
