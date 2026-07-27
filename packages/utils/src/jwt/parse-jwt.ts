/**
 * Decode the payload of a JWT without verifying its signature. Returns
 * `undefined` for malformed tokens.
 *
 * @example
 * ```ts
 * const payload = parseJwt<{ aud: string }>(token);
 * if (payload?.aud === 't') { ... }
 * ```
 */
export function parseJwt<Payload = Record<string, unknown>>(token: string | undefined): Partial<Payload> | undefined {
  const base64Url = (token ?? '').split('.')[1];
  if (!base64Url) return undefined;

  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
