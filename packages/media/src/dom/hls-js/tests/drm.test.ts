import Hls from 'hls.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HTMLVideoElementHost } from '../../video-host';
import { HlsJsMediaDrmMixin, toDrmConfigKey } from '../drm';

class FakeHost extends HTMLVideoElementHost {
  engine: Hls | null;

  constructor(params: { engine?: Hls | null; drm?: any } = {}) {
    super();
    this.engine = params.engine ?? null;
  }
}

const HlsJsMediaDrm = HlsJsMediaDrmMixin(FakeHost);

function createEngine(userConfig: Record<string, any> = {}): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  return {
    config: { emeEnabled: false, drmSystems: {}, requestMediaKeySystemAccessFunc: null },
    userConfig,
    on(event: string, fn: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    },
    off(event: string, fn: (...args: any[]) => void) {
      listeners.get(event)?.delete(fn);
    },
    emit(event: string, ...args: any[]) {
      for (const fn of listeners.get(event) ?? []) fn(event, ...args);
    },
  } as unknown as Hls;
}

const FAIRPLAY = { licenseUrl: 'https://license.test/fairplay', certificateUrl: 'https://license.test/appcert' };
const WIDEVINE = { licenseUrl: 'https://license.test/widevine' };
const PLAYREADY = { licenseUrl: 'https://license.test/playready' };

function stubKeySystemAccess() {
  const requestMediaKeySystemAccess = vi.fn(async () => ({}) as MediaKeySystemAccess);
  Object.defineProperty(navigator, 'requestMediaKeySystemAccess', {
    value: requestMediaKeySystemAccess,
    configurable: true,
    writable: true,
  });
  return requestMediaKeySystemAccess;
}

function videoCapabilities() {
  return [{ contentType: 'video/mp4;codecs="avc1.640028"' }];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HlsJsMediaDrmMixin', () => {
  it('leaves EME untouched when no DRM is configured', () => {
    const engine = createEngine();
    const host = new HlsJsMediaDrm({ engine });

    expect(host.drm).toBeNull();
    expect(engine.config.emeEnabled).toBe(false);
    expect(engine.config.drmSystems).toEqual({});
    expect(engine.config.requestMediaKeySystemAccessFunc).toBeNull();
  });

  it('maps configured systems to their EME key system ids', () => {
    const engine = createEngine();
    new HlsJsMediaDrm({ engine, drm: { fairplay: FAIRPLAY, widevine: WIDEVINE, playready: PLAYREADY } });

    expect(engine.config.emeEnabled).toBe(true);
    expect(engine.config.drmSystems).toEqual({
      'com.apple.fps': {
        licenseUrl: FAIRPLAY.licenseUrl,
        serverCertificateUrl: FAIRPLAY.certificateUrl,
      },
      'com.widevine.alpha': { licenseUrl: WIDEVINE.licenseUrl },
      'com.microsoft.playready': { licenseUrl: PLAYREADY.licenseUrl },
    });
    expect(engine.config.requestMediaKeySystemAccessFunc).toBeTypeOf('function');
  });

  it('omits systems without a license URL', () => {
    const engine = createEngine();
    new HlsJsMediaDrm({ engine, drm: { widevine: WIDEVINE, playready: { licenseUrl: '' } } });

    expect(engine.config.drmSystems).toEqual({ 'com.widevine.alpha': { licenseUrl: WIDEVINE.licenseUrl } });
  });

  it('applies DRM assigned after construction', () => {
    const engine = createEngine();
    const host = new HlsJsMediaDrm({ engine });

    host.drm = { widevine: WIDEVINE };

    expect(host.drm).toEqual({ widevine: WIDEVINE });
    expect(engine.config.emeEnabled).toBe(true);
    expect(engine.config.drmSystems).toEqual({ 'com.widevine.alpha': { licenseUrl: WIDEVINE.licenseUrl } });
  });

  it('restores the user hls.js config when DRM is cleared', () => {
    const engine = createEngine();
    const host = new HlsJsMediaDrm({ engine, drm: { widevine: WIDEVINE } });

    host.drm = null;

    expect(engine.config.emeEnabled).toBe(false);
    expect(engine.config.drmSystems).toEqual({});
    expect(engine.config.requestMediaKeySystemAccessFunc).toBe(Hls.DefaultConfig.requestMediaKeySystemAccessFunc);
  });

  it('re-applies on MANIFEST_LOADING', () => {
    const engine = createEngine();
    new HlsJsMediaDrm({ engine, drm: { widevine: WIDEVINE } });

    engine.config.emeEnabled = false;
    (engine as any).emit(Hls.Events.MANIFEST_LOADING);

    expect(engine.config.emeEnabled).toBe(true);
  });

  it('lets user hls.js options win over the derived config', () => {
    const requestMediaKeySystemAccessFunc = vi.fn();
    const engine = createEngine({
      drmSystems: { 'com.widevine.alpha': { licenseUrl: 'https://custom.test/widevine' } },
      requestMediaKeySystemAccessFunc,
    });

    new HlsJsMediaDrm({ engine, drm: { fairplay: FAIRPLAY, widevine: WIDEVINE } });

    expect(engine.config.drmSystems).toEqual({
      'com.apple.fps': {
        licenseUrl: FAIRPLAY.licenseUrl,
        serverCertificateUrl: FAIRPLAY.certificateUrl,
      },
      'com.widevine.alpha': { licenseUrl: 'https://custom.test/widevine' },
    });
    expect(engine.config.requestMediaKeySystemAccessFunc).toBe(requestMediaKeySystemAccessFunc);
  });

  describe('key system access', () => {
    it('prefers hardware robustness for Widevine while keeping a fallback', async () => {
      const requestMediaKeySystemAccess = stubKeySystemAccess();
      const engine = createEngine();
      new HlsJsMediaDrm({ engine, drm: { widevine: WIDEVINE } });

      const configurations = [{ videoCapabilities: videoCapabilities() }];
      await engine.config.requestMediaKeySystemAccessFunc!('com.widevine.alpha' as any, configurations as any);

      const [keySystem, requested] = requestMediaKeySystemAccess.mock.calls[0] as unknown as [
        string,
        MediaKeySystemConfiguration[],
      ];

      expect(keySystem).toBe('com.widevine.alpha');
      expect(requested).toHaveLength(2);
      expect(requested[0]!.videoCapabilities![0]!.robustness).toBe('HW_SECURE_ALL');
      expect(requested[1]!.videoCapabilities![0]!.robustness).toBeUndefined();
      // The caller's configurations must not be mutated.
      expect(configurations[0]!.videoCapabilities[0]).not.toHaveProperty('robustness');
    });

    it('passes configurations through unchanged for other key systems', async () => {
      const requestMediaKeySystemAccess = stubKeySystemAccess();
      const engine = createEngine();
      new HlsJsMediaDrm({ engine, drm: { fairplay: FAIRPLAY } });

      const configurations = [{ videoCapabilities: videoCapabilities() }];
      await engine.config.requestMediaKeySystemAccessFunc!('com.apple.fps' as any, configurations as any);

      expect(requestMediaKeySystemAccess).toHaveBeenCalledWith('com.apple.fps', configurations);
    });

    it('propagates a denied request', async () => {
      const requestMediaKeySystemAccess = stubKeySystemAccess();
      requestMediaKeySystemAccess.mockRejectedValueOnce(new Error('unsupported'));

      const engine = createEngine();
      new HlsJsMediaDrm({ engine, drm: { widevine: WIDEVINE } });

      await expect(engine.config.requestMediaKeySystemAccessFunc!('com.widevine.alpha' as any, [])).rejects.toThrow(
        'unsupported'
      );
    });
  });

  it('is inert without an engine', () => {
    const host = new HlsJsMediaDrm({ engine: null, drm: { widevine: WIDEVINE } });
    expect(host.drm).toEqual({ widevine: WIDEVINE });
  });

  it('warns in dev when FairPlay has no certificate URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = createEngine();

    new HlsJsMediaDrm({ engine, drm: { fairplay: { licenseUrl: FAIRPLAY.licenseUrl } } });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('certificateUrl'));
  });
});

describe('toDrmConfigKey', () => {
  it('is stable across equal configs in different objects', () => {
    expect(toDrmConfigKey({ fairplay: { ...FAIRPLAY }, widevine: { ...WIDEVINE } })).toBe(
      toDrmConfigKey({ widevine: { ...WIDEVINE }, fairplay: { ...FAIRPLAY } })
    );
  });

  it('changes when a license or certificate URL changes', () => {
    expect(toDrmConfigKey({ widevine: WIDEVINE })).not.toBe(
      toDrmConfigKey({ widevine: { licenseUrl: 'https://other.test/widevine' } })
    );
    expect(toDrmConfigKey({ fairplay: FAIRPLAY })).not.toBe(
      toDrmConfigKey({ fairplay: { licenseUrl: FAIRPLAY.licenseUrl } })
    );
  });

  it('treats missing, empty, and unusable configs alike', () => {
    expect(toDrmConfigKey(null)).toBe(toDrmConfigKey(undefined));
    expect(toDrmConfigKey({})).toBe(toDrmConfigKey(null));
    expect(toDrmConfigKey({ widevine: { licenseUrl: '' } })).toBe(toDrmConfigKey(null));
  });
});
