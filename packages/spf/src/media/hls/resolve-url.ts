/**
 * Resolve a potentially relative URL against a base URL using native URL API.
 */
export function resolveUrl(url: string, baseUrl: string): string {
  return new URL(url, baseUrl).href;
}
