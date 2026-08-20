import { describe, expect, it } from 'vitest';
import type { Presentation } from '../../types';
import {
  buildKeySystemConfigurations,
  declaredDrmKeys,
  initDataFromKeyUri,
  KEY_SYSTEM_BY_KEY_FORMAT,
  keySystemCandidates,
} from '../eme';

// "ping" in base64 — small stand-in for a PSSH payload.
const PSSH_BASE64 = 'cGluZw==';
const PSSH_BYTES = new Uint8Array([0x70, 0x69, 0x6e, 0x67]);

const WIDEVINE_KEY = {
  method: 'SAMPLE-AES',
  uri: `data:text/plain;base64,${PSSH_BASE64}`,
  keyFormat: 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
};
const FAIRPLAY_KEY = {
  method: 'SAMPLE-AES',
  uri: 'skd://mux?keyId=abc',
  keyFormat: 'com.apple.streamingkeydelivery',
};

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

function makeResolvedTrack(keys?: object[], overrides: object = {}) {
  return {
    type: 'video' as const,
    id: 'v-1',
    url: 'https://example.com/v.m3u8',
    bandwidth: 1000,
    mimeType: 'video/mp4',
    codecs: ['avc1.4d401f'],
    segments: [{ id: 's0', url: 'https://example.com/0.m4s', startTime: 0, duration: 4 }],
    startTime: 0,
    duration: 4,
    ...(keys && { metadata: { mediaPlaylist: { targetDuration: 4, mediaSequence: 0, endList: true, keys } } }),
    ...overrides,
  };
}

describe('KEY_SYSTEM_BY_KEY_FORMAT', () => {
  it('maps the three HLS DRM KEYFORMAT identities to EME key-system ids', () => {
    expect(KEY_SYSTEM_BY_KEY_FORMAT['urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed']).toBe('com.widevine.alpha');
    expect(KEY_SYSTEM_BY_KEY_FORMAT['com.microsoft.playready']).toBe('com.microsoft.playready');
    expect(KEY_SYSTEM_BY_KEY_FORMAT['com.apple.streamingkeydelivery']).toBe('com.apple.fps');
  });
});

describe('initDataFromKeyUri', () => {
  it('decodes a base64 data: URI to bytes', () => {
    expect(initDataFromKeyUri(`data:text/plain;base64,${PSSH_BASE64}`)).toEqual(PSSH_BYTES);
  });

  it('decodes with media-type parameters before the base64 marker', () => {
    expect(initDataFromKeyUri(`data:text/plain;charset=UTF-16;base64,${PSSH_BASE64}`)).toEqual(PSSH_BYTES);
  });

  it('carries no init data for non-data: URIs (skd://, https://)', () => {
    expect(initDataFromKeyUri('skd://mux?keyId=abc')).toBeUndefined();
    expect(initDataFromKeyUri('https://example.com/key.bin')).toBeUndefined();
  });

  it('carries no init data for a non-base64 data: URI', () => {
    expect(initDataFromKeyUri('data:text/plain,hello')).toBeUndefined();
  });
});

describe('declaredDrmKeys', () => {
  it('collects keys from resolved tracks', () => {
    const presentation = makePresentation([makeResolvedTrack([WIDEVINE_KEY, FAIRPLAY_KEY])]);
    expect(declaredDrmKeys(presentation)).toEqual([WIDEVINE_KEY, FAIRPLAY_KEY]);
  });

  it('dedupes the same declaration across tracks', () => {
    const presentation = makePresentation([
      makeResolvedTrack([WIDEVINE_KEY]),
      makeResolvedTrack([WIDEVINE_KEY], { id: 'v-2', url: 'https://example.com/v2.m3u8' }),
    ]);
    expect(declaredDrmKeys(presentation)).toEqual([WIDEVINE_KEY]);
  });

  it('is empty for unresolved presentations, clear tracks, and unresolved tracks', () => {
    expect(declaredDrmKeys(undefined)).toEqual([]);
    expect(declaredDrmKeys({ url: 'https://example.com/m.m3u8' })).toEqual([]);
    expect(declaredDrmKeys(makePresentation([makeResolvedTrack()]))).toEqual([]);
  });
});

describe('keySystemCandidates', () => {
  const drm = {
    'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' },
    'com.apple.fps': { licenseUrl: 'https://license.example.com/fairplay' },
  };

  it('intersects declared key formats with configured systems, in preference order', () => {
    // FairPlay outranks Widevine in the fixed preference order even when
    // declared second.
    expect(keySystemCandidates([WIDEVINE_KEY, FAIRPLAY_KEY], drm)).toEqual(['com.apple.fps', 'com.widevine.alpha']);
  });

  it('omits declared systems with no configured license server', () => {
    expect(
      keySystemCandidates([WIDEVINE_KEY, FAIRPLAY_KEY], { 'com.widevine.alpha': drm['com.widevine.alpha'] })
    ).toEqual(['com.widevine.alpha']);
  });

  it('ignores keys with unrecognized or absent KEYFORMAT', () => {
    expect(keySystemCandidates([{ method: 'AES-128', uri: 'k.bin' }], drm)).toEqual([]);
  });
});

describe('buildKeySystemConfigurations', () => {
  it('builds one cenc configuration with per-type capabilities from track content types', () => {
    const [config] = buildKeySystemConfigurations({
      video: ['video/mp4; codecs="avc1.4d401f"'],
      audio: ['audio/mp4; codecs="mp4a.40.2"'],
    });

    expect(config?.initDataTypes).toEqual(['cenc']);
    expect(config?.videoCapabilities).toEqual([{ contentType: 'video/mp4; codecs="avc1.4d401f"' }]);
    expect(config?.audioCapabilities).toEqual([{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }]);
  });

  it('omits a capability list when that type has no content types', () => {
    const [config] = buildKeySystemConfigurations({ video: ['video/mp4; codecs="avc1.4d401f"'], audio: [] });

    expect(config?.videoCapabilities).toHaveLength(1);
    expect(config?.audioCapabilities).toBeUndefined();
  });
});
