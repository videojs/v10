/**
 * HTTP Fetch Wrapper
 *
 * Composable building blocks:
 * - fetchResolvable() — fetch a Resource (handles byte ranges); returns Response
 * - getResponseText() — extract text from Response
 * - fetchResolvableStream() — single-stage async generator over body chunks
 * - fetchStream() — two-stage: await connection establishment, then lazily
 *   iterate body chunks. Use when timing the connection start independently
 *   of body consumption matters (e.g., observable fetch timing for ABR).
 * - createTrackedFetch() — factory for a fetchStream-shape function that
 *   samples bandwidth (via EWMA) per chunk and notifies via callback.
 */

import { type BandwidthState, sampleBandwidth } from './bandwidth-estimator';
import { ChunkedStreamIterable, type ChunkedStreamIterableOptions } from './chunked-stream-iterable';

/**
 * Minimal Response-like interface for text extraction.
 * Allows testing without full Response object.
 */
export interface ResponseLike {
  text(): Promise<string>;
}

/**
 * An HTTP-addressable resource — URL plus optional byte range.
 * Media's `AddressableObject` (and anything else with the same shape)
 * is structurally compatible; kept local so this module stays
 * domain-agnostic.
 */
export interface Resource {
  url: string;
  byteRange?: {
    start: number;
    end: number;
  };
}

/**
 * Fetch resolvable from a Resource.
 *
 * Handles byte range requests if byteRange is present.
 * Returns native fetch Response for composability (can extract text, stream, etc.).
 *
 * @param addressable - Resource to fetch (url + optional byteRange)
 * @returns Promise resolving to Response
 *
 * @example
 * const response = await fetchResolvable({ url: 'https://example.com/segment.m4s' });
 * const text = await getResponseText(response);
 *
 * @example
 * // With byte range
 * const response = await fetchResolvable({
 *   url: 'https://example.com/file.mp4',
 *   byteRange: { start: 1000, end: 1999 }
 * });
 */
export async function fetchResolvable(addressable: Resource, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers);

  // Add Range header for byte range requests
  if (addressable.byteRange) {
    const { start, end } = addressable.byteRange;
    headers.set('Range', `bytes=${start}-${end}`);
  }

  const request = new Request(addressable.url, {
    method: 'GET',
    headers,
    ...options,
  });

  return fetch(request);
}

/**
 * Fetch resolvable as bytes.
 *
 * Convenience wrapper around fetchResolvable that resolves the body as an
 * ArrayBuffer. Use this when you need the raw bytes (e.g. segment appends).
 * For text or streaming consumption, use fetchResolvable directly.
 */
export async function fetchResolvableBytes(addressable: Resource, options?: RequestInit): Promise<ArrayBuffer> {
  const response = await fetchResolvable(addressable, options);
  return response.arrayBuffer();
}

/**
 * Fetch resolvable as a stream of Uint8Array chunks.
 *
 * Convenience wrapper around fetchResolvable that yields the body as chunks
 * via ChunkedStreamIterable. Headers are awaited before the first chunk is
 * yielded (TTFB is accounted for before iteration begins).
 *
 * Throws if the response body is null (e.g. non-body HTTP status).
 * Errors from the underlying stream propagate naturally as thrown errors.
 */
export async function* fetchResolvableStream(
  addressable: Resource,
  options?: RequestInit & ChunkedStreamIterableOptions
): AsyncGenerator<Uint8Array> {
  const { minChunkSize, ...fetchOptions } = options ?? {};
  const response = await fetchResolvable(addressable, fetchOptions);
  if (!response.body) throw new Error('Response has no body');
  yield* new ChunkedStreamIterable(response.body, ...(minChunkSize !== undefined ? [{ minChunkSize }] : []));
}

/**
 * Extract text from Response.
 *
 * Accepts minimal Response-like object (just needs text() method).
 * Returns promise from response.text().
 *
 * @param response - Response-like object with text() method
 * @returns Promise resolving to text content
 *
 * @example
 * const response = await fetchResolvable(addressable);
 * const text = await getResponseText(response);
 */
export function getResponseText(response: ResponseLike): Promise<string> {
  return response.text();
}

/**
 * Two-stage fetch helper: eagerly starts the HTTP request (TTFB is awaited),
 * then returns a lazy iterable over the response body. Separating connection
 * start from body iteration makes fetch timing predictable and observable
 * regardless of when downstream consumers begin pulling chunks.
 *
 * Sibling to {@link fetchResolvableStream}, which is single-stage (calls
 * `fetch` only when iteration starts). Pick `fetchStream` when "when did the
 * fetch start" needs to be observable separately from "when did the body
 * begin arriving."
 */
export type FetchOptions = RequestInit & ChunkedStreamIterableOptions;

export type FetchBytes = (addressable: Resource, options?: FetchOptions) => Promise<AsyncIterable<Uint8Array>>;

export async function fetchStream(addressable: Resource, options?: FetchOptions): Promise<AsyncIterable<Uint8Array>> {
  const { minChunkSize, ...fetchOptions } = options ?? {};
  const response = await fetchResolvable(addressable, fetchOptions);
  if (!response.body) throw new Error('Response has no body');
  return new ChunkedStreamIterable(response.body, ...(minChunkSize !== undefined ? [{ minChunkSize }] : []));
}

/**
 * Returns a {@link FetchBytes} function that samples bandwidth via EWMA
 * per body chunk. The factory captures the running bandwidth state
 * internally; per chunk it computes the next state and notifies the
 * supplied `onSample` callback.
 *
 * The factory's internal accumulator is seeded from `initial` and updated
 * on every chunk; callers don't need to thread it back in. `onSample`
 * receives the *new* state after each chunk — typical use is to bridge
 * samples back into engine state for ABR consumers.
 *
 * @param initial - Starting `BandwidthState` (commonly zeros or the
 *   engine's current accumulator).
 * @param onSample - Called with the new `BandwidthState` after each chunk.
 */
export function createTrackedFetch(initial: BandwidthState, onSample: (next: BandwidthState) => void): FetchBytes {
  let state = initial;
  return async (addressable, options) => {
    const { minChunkSize, ...fetchOptions } = options ?? {};
    const response = await fetchResolvable(addressable, fetchOptions);
    if (!response.body) throw new Error('Response has no body');
    const body = response.body;
    return {
      [Symbol.asyncIterator]: async function* () {
        let chunkStart = performance.now();
        for await (const chunk of new ChunkedStreamIterable(
          body,
          ...(minChunkSize !== undefined ? [{ minChunkSize }] : [])
        )) {
          const elapsed = performance.now() - chunkStart;
          state = sampleBandwidth(state, elapsed, chunk.byteLength);
          onSample(state);
          yield chunk;
          chunkStart = performance.now();
        }
      },
    };
  };
}
