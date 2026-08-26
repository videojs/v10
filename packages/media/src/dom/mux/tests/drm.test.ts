import { describe, expect, it } from 'vite-plus/test';

import { createMuxDrmSystems } from '../drm';

// Header `{"alg":"HS256"}`, body sets `aud`, empty signature. Unpadded base64url,
// like a real JWT, so it survives a query string untouched.
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${encode({ alg: 'HS256' })}.${encode(payload)}.`;
}

describe('createMuxDrmSystems', () => {
  const token = fakeJwt({ aud: 'd' });

  it('derives every Mux license server from the DRM token', () => {
    expect(createMuxDrmSystems({ playbackId: 'abc123', drm: { token } })).toEqual({
      'com.apple.fps': {
        licenseUrl: `https://license.mux.com/license/fairplay/abc123?token=${token}`,
        serverCertificateUrl: `https://license.mux.com/appcert/fairplay/abc123?token=${token}`,
      },
      'com.widevine.alpha': { licenseUrl: `https://license.mux.com/license/widevine/abc123?token=${token}` },
      'com.microsoft.playready': { licenseUrl: `https://license.mux.com/license/playready/abc123?token=${token}` },
    });
  });

  it('uses the custom domain', () => {
    const drmSystems = createMuxDrmSystems({ playbackId: 'abc123', customDomain: 'example.com', drm: { token } });

    expect(drmSystems?.['com.widevine.alpha']?.licenseUrl).toBe(
      `https://license.example.com/license/widevine/abc123?token=${token}`
    );
  });

  it('returns undefined without a playbackId', () => {
    expect(createMuxDrmSystems()).toBeUndefined();
    expect(createMuxDrmSystems({ playbackId: '', drm: { token } })).toBeUndefined();
  });

  it('returns undefined without a DRM token', () => {
    expect(createMuxDrmSystems({ playbackId: 'abc123' })).toBeUndefined();
    expect(createMuxDrmSystems({ playbackId: 'abc123', drm: {} })).toBeUndefined();
  });

  it('returns undefined for a token with the wrong audience', () => {
    // A playback token where a license token belongs: every license request would be rejected.
    expect(createMuxDrmSystems({ playbackId: 'abc123', drm: { token: fakeJwt({ aud: 'v' }) } })).toBeUndefined();
  });
});
