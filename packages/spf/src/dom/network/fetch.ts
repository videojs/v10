/**
 * HTTP Fetch Wrapper
 *
 * Two-function approach for composability:
 * 1. fetchResolvable() - Fetch AddressableObject (handles byte ranges)
 * 2. getResponseText() - Extract text from Response
 */

import type { AddressableObject } from '../../core/types';

/**
 * Minimal Response-like interface for text extraction.
 * Allows testing without full Response object.
 */
export interface ResponseLike {
  text(): Promise<string>;
}

/**
 * Fetch resolvable from AddressableObject.
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
export async function fetchResolvable(addressable: AddressableObject): Promise<Response> {
  const headers = new Headers();

  // Add Range header for byte range requests
  if (addressable.byteRange) {
    const { start, end } = addressable.byteRange;
    headers.set('Range', `bytes=${start}-${end}`);
  }

  const request = new Request(addressable.url, {
    method: 'GET',
    headers,
  });

  return fetch(request);
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
