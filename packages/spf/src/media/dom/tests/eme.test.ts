import { describe, expect, it, vi } from 'vite-plus/test';

import type { Presentation } from '../../types';
import {
  buildKeySystemConfigurations,
  contentTypesFromPresentation,
  type KeySystemModule,
  requestKeySystemAccess,
  shapeLicenseRequest,
} from '../eme';
import { fairPlayKeySystem, playReadyKeySystem, widevineKeySystem } from '../key-systems';

const VIDEO_TYPE = 'video/mp4; codecs="avc1.4d401f"';
const AUDIO_TYPE = 'audio/mp4; codecs="mp4a.40.2"';

function makeTrack(type: 'video' | 'audio', overrides: object = {}) {
  return {
    type,
    id: `${type}-1`,
    url: `https://example.com/${type}.m3u8`,
    bandwidth: 1000,
    mimeType: `${type}/mp4`,
    codecs: [type === 'video' ? 'avc1.4d401f' : 'mp4a.40.2'],
    segments: [{ id: 's0', url: 'https://example.com/0.m4s', startTime: 0, duration: 4 }],
    startTime: 0,
    duration: 4,
    ...overrides,
  };
}

function makePresentation(tracks: object[]): Presentation {
  return {
    id: 'p1',
    url: 'https://example.com/multivariant.m3u8',
    selectionSets: [
      {
        id: 'ss1',
        type: 'video' as const,
        switchingSets: [{ id: 'sw1', type: 'video' as const, tracks }],
      },
    ],
  } as Presentation;
}

describe('contentTypesFromPresentation', () => {
  it('collects the unique audio and video content types', () => {
    const presentation = makePresentation([makeTrack('video'), makeTrack('audio')]);

    expect(contentTypesFromPresentation(presentation)).toEqual({ video: [VIDEO_TYPE], audio: [AUDIO_TYPE] });
  });

  it('dedupes renditions sharing a content type — one ladder is one capability', () => {
    const presentation = makePresentation([makeTrack('video'), makeTrack('video', { id: 'v-2', bandwidth: 2000 })]);

    expect(contentTypesFromPresentation(presentation).video).toEqual([VIDEO_TYPE]);
  });

  it('skips tracks with nothing to build a content type from, and non-a/v types', () => {
    const presentation = makePresentation([
      makeTrack('video', { codecs: undefined }),
      makeTrack('audio', { mimeType: undefined }),
      makeTrack('video', { id: 'text-1', type: 'text' }),
    ]);

    expect(contentTypesFromPresentation(presentation)).toEqual({ video: [], audio: [] });
  });

  it('is empty for an absent or unresolved presentation', () => {
    expect(contentTypesFromPresentation(undefined)).toEqual({ video: [], audio: [] });
    expect(contentTypesFromPresentation({ url: 'https://example.com/m.m3u8' })).toEqual({ video: [], audio: [] });
  });
});

describe('requestKeySystemAccess', () => {
  it("walks a module's request variants in order and reports the module", async () => {
    const spy = vi.spyOn(navigator, 'requestMediaKeySystemAccess');
    const access = {} as MediaKeySystemAccess;

    spy.mockRejectedValueOnce(new Error('no plain CDM')).mockResolvedValueOnce(access);

    const result = await requestKeySystemAccess([playReadyKeySystem], { video: [], audio: [] });

    expect(spy.mock.calls.map(([keySystem]) => keySystem)).toEqual([
      'com.microsoft.playready',
      'com.microsoft.playready.recommendation',
    ]);
    // The module, not the variant that happened to win: license-server lookup
    // and message shaping key off the configured id.
    expect(result).toEqual({ module: playReadyKeySystem, access });
    spy.mockRestore();
  });

  it('stops at the first variant a CDM accepts', async () => {
    const spy = vi.spyOn(navigator, 'requestMediaKeySystemAccess');

    spy.mockResolvedValue({} as MediaKeySystemAccess);

    await requestKeySystemAccess([playReadyKeySystem], { video: [], audio: [] });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe('com.microsoft.playready');
    spy.mockRestore();
  });

  it('falls through to the next module and defaults its request string to its key system', async () => {
    const spy = vi.spyOn(navigator, 'requestMediaKeySystemAccess');
    const access = {} as MediaKeySystemAccess;

    spy.mockRejectedValueOnce(new Error('no FairPlay here')).mockResolvedValueOnce(access);

    const result = await requestKeySystemAccess([fairPlayKeySystem, widevineKeySystem], { video: [], audio: [] });

    expect(spy.mock.calls.map(([keySystem]) => keySystem)).toEqual(['com.apple.fps', 'com.widevine.alpha']);
    expect(result?.module).toBe(widevineKeySystem);
    spy.mockRestore();
  });

  it('resolves undefined when every candidate is refused, or none were given', async () => {
    const spy = vi.spyOn(navigator, 'requestMediaKeySystemAccess');

    spy.mockRejectedValue(new Error('refused'));

    expect(await requestKeySystemAccess([widevineKeySystem], { video: [], audio: [] })).toBeUndefined();
    expect(await requestKeySystemAccess([], { video: [], audio: [] })).toBeUndefined();
    spy.mockRestore();
  });
});

describe('shapeLicenseRequest', () => {
  it('posts raw bytes as octet-stream for a module declaring no shaping', () => {
    const message = new Uint8Array([1, 2, 3]).buffer;
    const shaped = shapeLicenseRequest(widevineKeySystem, message);

    expect(shaped.body).toBe(message);
    expect(shaped.headers).toEqual({ 'Content-Type': 'application/octet-stream' });
  });

  it('delegates to the module when it declares its own shaping', () => {
    const module_: KeySystemModule = {
      keySystem: 'com.example.drm',
      keyFormats: [],
      shapeLicenseRequest: () => ({ body: new Uint8Array([7]), headers: { 'Content-Type': 'application/json' } }),
    };

    expect(shapeLicenseRequest(module_, new Uint8Array([1]).buffer)).toEqual({
      body: new Uint8Array([7]),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('falls back to octet-stream for an absent module', () => {
    const message = new Uint8Array([1]).buffer;

    expect(shapeLicenseRequest(undefined, message)).toEqual({
      body: message,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  });
});

describe('buildKeySystemConfigurations', () => {
  it('builds one configuration with per-type capabilities from track content types', () => {
    const [config] = buildKeySystemConfigurations(playReadyKeySystem, { video: [VIDEO_TYPE], audio: [AUDIO_TYPE] });

    expect(config?.initDataTypes).toEqual(['cenc']);
    expect(config?.videoCapabilities).toEqual([{ contentType: VIDEO_TYPE }]);
    expect(config?.audioCapabilities).toEqual([{ contentType: AUDIO_TYPE }]);
  });

  it("uses the module's own init-data types when it declares them", () => {
    const [config] = buildKeySystemConfigurations(fairPlayKeySystem, { video: [VIDEO_TYPE], audio: [] });

    expect(config?.initDataTypes).toEqual(['sinf', 'cenc']);
  });

  it('stamps the declared encryption scheme on every capability', () => {
    const [config] = buildKeySystemConfigurations(
      playReadyKeySystem,
      { video: [VIDEO_TYPE], audio: [AUDIO_TYPE] },
      'cbcs'
    );

    expect(config?.videoCapabilities).toEqual([{ contentType: VIDEO_TYPE, encryptionScheme: 'cbcs' }]);
    expect(config?.audioCapabilities).toEqual([{ contentType: AUDIO_TYPE, encryptionScheme: 'cbcs' }]);
  });

  it('offers an unstamped fallback after the declared scheme', () => {
    const configs = buildKeySystemConfigurations(
      playReadyKeySystem,
      { video: [VIDEO_TYPE], audio: [AUDIO_TYPE] },
      'cbcs'
    );

    // `requestMediaKeySystemAccess` picks the first supported entry, so a CDM that refuses the
    // `encryptionScheme` member still negotiates on the second.
    expect(configs).toHaveLength(2);
    expect(configs[1]?.videoCapabilities).toEqual([{ contentType: VIDEO_TYPE }]);
    expect(configs[1]?.audioCapabilities).toEqual([{ contentType: AUDIO_TYPE }]);
    expect(configs[1]?.initDataTypes).toEqual(['cenc']);
  });

  it('offers the stamped configuration alone when the module opts out of the fallback', () => {
    // The composable half of the scheme permutation: a system whose CDMs honour
    // the member negotiates once instead of twice.
    const module_: KeySystemModule = { ...playReadyKeySystem, schemeFallback: false };
    const configs = buildKeySystemConfigurations(module_, { video: [VIDEO_TYPE], audio: [] }, 'cbcs');

    expect(configs).toHaveLength(1);
    expect(configs[0]?.videoCapabilities).toEqual([{ contentType: VIDEO_TYPE, encryptionScheme: 'cbcs' }]);
  });

  it('offers only one configuration when neither preference applies', () => {
    expect(buildKeySystemConfigurations(playReadyKeySystem, { video: [VIDEO_TYPE], audio: [] })).toHaveLength(1);
  });

  it("prefers the module's video robustness, with an unrobust fallback", () => {
    const configs = buildKeySystemConfigurations(widevineKeySystem, { video: [VIDEO_TYPE], audio: [AUDIO_TYPE] });

    expect(configs).toHaveLength(2);
    expect(configs[0]?.videoCapabilities).toEqual([{ contentType: VIDEO_TYPE, robustness: 'HW_SECURE_ALL' }]);
    expect(configs[1]?.videoCapabilities).toEqual([{ contentType: VIDEO_TYPE }]);
    // Audio stays at the CDM's default in both — no tier is worth a failed negotiation.
    expect(configs[0]?.audioCapabilities).toEqual([{ contentType: AUDIO_TYPE }]);
  });

  it('leaves robustness unset for a module with no preferred tier', () => {
    const configs = buildKeySystemConfigurations(playReadyKeySystem, { video: [VIDEO_TYPE], audio: [] });

    expect(configs).toHaveLength(1);
    expect(configs[0]?.videoCapabilities).toEqual([{ contentType: VIDEO_TYPE }]);
  });

  it('composes scheme and robustness preferences, scheme outermost', () => {
    const configs = buildKeySystemConfigurations(widevineKeySystem, { video: [VIDEO_TYPE], audio: [] }, 'cbcs');

    expect(
      configs.map((config) => [
        config.videoCapabilities?.[0]?.encryptionScheme,
        config.videoCapabilities?.[0]?.robustness,
      ])
    ).toEqual([
      ['cbcs', 'HW_SECURE_ALL'],
      ['cbcs', undefined],
      [undefined, 'HW_SECURE_ALL'],
      [undefined, undefined],
    ]);
  });

  it('omits a capability list when that type has no content types', () => {
    const [config] = buildKeySystemConfigurations(playReadyKeySystem, { video: [VIDEO_TYPE], audio: [] });

    expect(config?.videoCapabilities).toHaveLength(1);
    expect(config?.audioCapabilities).toBeUndefined();
  });
});
