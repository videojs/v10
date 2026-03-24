import { describe, expect, it, vi } from 'vitest';

import { getDRMConfig, toPlaybackIdFromSrc } from '../drm';

describe('toPlaybackIdFromSrc', () => {
  it('extracts playback ID from a stream.mux.com URL', () => {
    expect(toPlaybackIdFromSrc('https://stream.mux.com/abc123.m3u8')).toBe('abc123');
  });

  it('extracts playback ID from a URL with query params', () => {
    expect(toPlaybackIdFromSrc('https://stream.mux.com/abc123.m3u8?redundant_streams=true')).toBe('abc123');
  });

  it('extracts playback ID from a subdirectory-style URL', () => {
    expect(toPlaybackIdFromSrc('https://stream.mux.com/abc123/low.m3u8')).toBe('abc123');
  });

  it('returns undefined for non-mux URLs', () => {
    expect(toPlaybackIdFromSrc('https://example.com/video.m3u8')).toBeUndefined();
  });

  it('returns undefined for non-stream subdomains', () => {
    expect(toPlaybackIdFromSrc('https://image.mux.com/abc123/thumbnail.webp')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(toPlaybackIdFromSrc('')).toBeUndefined();
  });
});

describe('getDRMConfig', () => {
  const playbackId = 'test-playback-id';
  const drmToken = 'test-drm-token';

  it('sets emeEnabled to true', () => {
    const config = getDRMConfig(playbackId, drmToken);
    expect(config.emeEnabled).toBe(true);
  });

  it('includes FairPlay license URL', () => {
    const config = getDRMConfig(playbackId, drmToken);
    const fps = config.drmSystems?.['com.apple.fps'];
    expect(fps?.licenseUrl).toBe(`https://license.mux.com/license/fairplay/${playbackId}?token=${drmToken}`);
  });

  it('includes FairPlay server certificate URL', () => {
    const config = getDRMConfig(playbackId, drmToken);
    const fps = config.drmSystems?.['com.apple.fps'];
    expect(fps?.serverCertificateUrl).toBe(`https://license.mux.com/appcert/fairplay/${playbackId}?token=${drmToken}`);
  });

  it('includes Widevine license URL', () => {
    const config = getDRMConfig(playbackId, drmToken);
    const widevine = config.drmSystems?.['com.widevine.alpha'];
    expect(widevine?.licenseUrl).toBe(`https://license.mux.com/license/widevine/${playbackId}?token=${drmToken}`);
  });

  it('includes PlayReady license URL', () => {
    const config = getDRMConfig(playbackId, drmToken);
    const playready = config.drmSystems?.['com.microsoft.playready'];
    expect(playready?.licenseUrl).toBe(`https://license.mux.com/license/playready/${playbackId}?token=${drmToken}`);
  });

  describe('requestMediaKeySystemAccessFunc', () => {
    it('passes through non-Widevine key systems unchanged', () => {
      const config = getDRMConfig(playbackId, drmToken);
      const mockFn = vi.fn().mockResolvedValue({});
      vi.stubGlobal('navigator', { requestMediaKeySystemAccess: mockFn });

      const supportedConfigs = [{ videoCapabilities: [{ contentType: 'video/mp4' }] }] as any;
      config.requestMediaKeySystemAccessFunc!('com.apple.fps' as any, supportedConfigs);

      expect(mockFn).toHaveBeenCalledWith('com.apple.fps', supportedConfigs);
      vi.unstubAllGlobals();
    });

    it('prepends HW_SECURE_ALL configs for Widevine', () => {
      const config = getDRMConfig(playbackId, drmToken);
      const mockFn = vi.fn().mockResolvedValue({});
      vi.stubGlobal('navigator', { requestMediaKeySystemAccess: mockFn });

      const supportedConfigs = [{ videoCapabilities: [{ contentType: 'video/mp4', robustness: '' }] }] as any;
      config.requestMediaKeySystemAccessFunc!('com.widevine.alpha' as any, supportedConfigs);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const calledConfigs: any[] = mockFn.mock.calls[0]![1];
      // Should have the HW_SECURE_ALL version first, then the original
      expect(calledConfigs).toHaveLength(2);
      expect(calledConfigs[0].videoCapabilities[0].robustness).toBe('HW_SECURE_ALL');
      expect(calledConfigs[1].videoCapabilities[0].robustness).toBe('');
      vi.unstubAllGlobals();
    });

    it('handles Widevine configs with no videoCapabilities', () => {
      const config = getDRMConfig(playbackId, drmToken);
      const mockFn = vi.fn().mockResolvedValue({});
      vi.stubGlobal('navigator', { requestMediaKeySystemAccess: mockFn });

      const supportedConfigs = [{}] as any;
      config.requestMediaKeySystemAccessFunc!('com.widevine.alpha' as any, supportedConfigs);

      // Config without videoCapabilities is skipped in HW_SECURE_ALL prepend, only original remains
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const calledConfigs: any[] = mockFn.mock.calls[0]![1];
      expect(calledConfigs).toHaveLength(1);
      vi.unstubAllGlobals();
    });
  });
});
