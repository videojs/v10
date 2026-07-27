import { describe, expect, it } from 'vitest';
import { parseJwt } from '../parse-jwt';

// Header `{"alg":"HS256"}`, body is the payload (UTF-8), empty signature.
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.`;
}

describe('parseJwt', () => {
  it('decodes a token payload', () => {
    expect(parseJwt(fakeJwt({ aud: 'v', sub: 'abc' }))).toMatchObject({ aud: 'v', sub: 'abc' });
  });

  it('decodes unicode payload values', () => {
    expect(parseJwt(fakeJwt({ sub: 'vidéo' }))).toMatchObject({ sub: 'vidéo' });
  });

  it('returns undefined for invalid tokens', () => {
    expect(parseJwt(undefined)).toBeUndefined();
    expect(parseJwt('')).toBeUndefined();
    expect(parseJwt('not-a-jwt')).toBeUndefined();
    expect(parseJwt('a.%%%.c')).toBeUndefined();
  });
});
