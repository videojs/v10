import { describe, expect, it } from 'vite-plus/test';

import { crossOriginToRequestCredentials } from '../request-credentials';

describe('crossOriginToRequestCredentials', () => {
  it('maps use-credentials to include, case-insensitively', () => {
    expect(crossOriginToRequestCredentials('use-credentials')).toBe('include');
    expect(crossOriginToRequestCredentials('USE-CREDENTIALS')).toBe('include');
  });

  it('leaves the platform default for anonymous and unknown keywords', () => {
    expect(crossOriginToRequestCredentials('anonymous')).toBeUndefined();
    expect(crossOriginToRequestCredentials('')).toBeUndefined();
    expect(crossOriginToRequestCredentials('bogus')).toBeUndefined();
  });

  it('leaves the platform default when the attribute is absent', () => {
    expect(crossOriginToRequestCredentials(null)).toBeUndefined();
    expect(crossOriginToRequestCredentials(undefined)).toBeUndefined();
  });
});
