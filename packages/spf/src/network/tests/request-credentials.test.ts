import { describe, expect, it } from 'vite-plus/test';

import { crossOriginToRequestCredentials } from '../request-credentials';

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
