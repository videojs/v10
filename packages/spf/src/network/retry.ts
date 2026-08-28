/**
 * Naive retry-with-backoff and a first-byte timeout — the first slice of the network-resilience feature's Tier 1
 * (`internal/design/spf/features/network-resilience.md`). Retries transient failures (network errors, first-byte
 * timeouts, and 5xx) with capped exponential backoff, and treats a 4xx as fatal.
 *
 * Deliberately minimal: the per-fetch-site policy, the full error-class matrix (`Retry-After`, 408 / 429 handling), a
 * session retry budget, a circuit breaker, and the config surface all belong to that feature. This is the least that
 * keeps a flaky server — license servers are the flakiest link in a DRM chain, and providers rate-limit — from parking
 * playback on a single transient blip. `fetchDrm` is the first consumer; segment and manifest fetches adopt the same
 * primitive when the feature lands.
 */

/** Retry policy. Defaults mirror hls.js's key/segment loader: ≈1s / 2s / 4s backoff, an 8s first-byte ceiling. */
export interface RetryPolicy {
  /** Attempts _after_ the first. */
  maxRetries: number;
  /** Backoff base; retry N waits `baseDelayMs * 2 ** (N - 1)`. */
  baseDelayMs: number;
  /** Abort — and retry — a request whose response headers don't arrive within this window. */
  firstByteTimeoutMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxRetries: 3, baseDelayMs: 1000, firstByteTimeoutMs: 8000 };

/** 5xx is transient; a 4xx (bad token, malformed request) is the client's to fix, so it is fatal — no retry. */
function isTransientStatus(status: number): boolean {
  return status >= 500;
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

/** A delay that rejects when the signal aborts, so a backoff wait never outlives a torn-down request. */
function backoffDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());

    const timer = setTimeout(resolve, ms);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true }
    );
  });
}

/**
 * Fetch `url` under the naive retry/timeout policy. Resolves with the first successful response, or a fatal 4xx the
 * caller surfaces as-is; throws the last error once retries are exhausted on a network error or first-byte timeout. The
 * caller's `signal` is honoured — an external abort propagates immediately and is never retried, so it stays
 * distinguishable from the internal first-byte timeout.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  signal: AbortSignal,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Promise<Response> {
  let attempt = 0;

  for (;;) {
    if (signal.aborted) throw abortError();

    const combined = AbortSignal.any([signal, AbortSignal.timeout(policy.firstByteTimeoutMs)]);

    try {
      const response = await fetch(url, { ...init, signal: combined });
      // Success, or a fatal status the caller must see as-is (4xx). Either way, stop.
      if (response.ok || !isTransientStatus(response.status)) return response;

      // Transient 5xx: out of budget hands the last response back to throw on.
      if (attempt >= policy.maxRetries) return response;
    } catch (error) {
      // The caller's own abort is not our timeout — propagate it, never retry.
      if (signal.aborted) throw error;

      // Network error or first-byte timeout: out of budget rethrows.
      if (attempt >= policy.maxRetries) throw error;
    }

    attempt++;
    await backoffDelay(policy.baseDelayMs * 2 ** (attempt - 1), signal);
  }
}
