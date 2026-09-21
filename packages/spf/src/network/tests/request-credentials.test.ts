import { describe, expect, it } from 'vite-plus/test';

import { crossOriginToRequestCredentials, normalizeCrossOrigin } from '../request-credentials';

describe('normalizeCrossOrigin', () => {
  it('keeps use-credentials in any ASCII case', () => {
    expect(normalizeCrossOrigin('use-credentials')).toBe('use-credentials');
    expect(normalizeCrossOrigin('USE-CREDENTIALS')).toBe('use-credentials');
    expect(normalizeCrossOrigin('Use-Credentials')).toBe('use-credentials');
  });

  it('reads anonymous, the bare attribute, and unknown keywords as anonymous', () => {
    expect(normalizeCrossOrigin('anonymous')).toBe('anonymous');
    expect(normalizeCrossOrigin('ANONYMOUS')).toBe('anonymous');
    expect(normalizeCrossOrigin('')).toBe('anonymous');
    expect(normalizeCrossOrigin('bogus')).toBe('anonymous');
  });

  it('keeps no attribute as null', () => {
    expect(normalizeCrossOrigin(null)).toBeNull();
    expect(normalizeCrossOrigin(undefined)).toBeNull();
  });
});

describe('crossOriginToRequestCredentials', () => {
  it('maps use-credentials to include', () => {
    expect(crossOriginToRequestCredentials('use-credentials')).toBe('include');
  });

  it('leaves the platform default for anonymous and the bare attribute', () => {
    expect(crossOriginToRequestCredentials('anonymous')).toBeUndefined();
    expect(crossOriginToRequestCredentials('')).toBeUndefined();
  });

  it('leaves the platform default when the attribute is absent', () => {
    expect(crossOriginToRequestCredentials(null)).toBeUndefined();
    expect(crossOriginToRequestCredentials(undefined)).toBeUndefined();
  });
});
