import { describe, expect, it, vi } from 'vitest';
import type { Presentation } from '../../types';
import {
  buildKeySystemConfigurations,
  declaredDrmKeys,
  declaredEncryptionScheme,
  initDataFromKeyUri,
  KEY_SYSTEM_BY_KEY_FORMAT,
  keySystemCandidates,
  requestKeySystemAccess,
  resolveDrmUrl,
  shapeLicenseRequest,
  toCencInitData,
  unplayableEncryptedTypes,
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

describe('declaredEncryptionScheme', () => {
  it('maps SAMPLE-AES to cbcs and SAMPLE-AES-CTR to cenc', () => {
    expect(declaredEncryptionScheme([WIDEVINE_KEY])).toBe('cbcs');
    expect(declaredEncryptionScheme([{ ...WIDEVINE_KEY, method: 'SAMPLE-AES-CTR' }])).toBe('cenc');
  });

  it('declares nothing for mixed or unrecognized methods', () => {
    expect(declaredEncryptionScheme([WIDEVINE_KEY, { ...WIDEVINE_KEY, method: 'SAMPLE-AES-CTR' }])).toBeUndefined();
    expect(declaredEncryptionScheme([{ method: 'AES-128', uri: 'k.bin' }])).toBeUndefined();
    expect(declaredEncryptionScheme([])).toBeUndefined();
  });
});

describe('requestKeySystemAccess', () => {
  it('walks PlayReady variants in order and reports the configured base id', async () => {
    const spy = vi.spyOn(navigator, 'requestMediaKeySystemAccess');
    const access = {} as MediaKeySystemAccess;
    spy.mockRejectedValueOnce(new Error('no recommendation CDM')).mockResolvedValueOnce(access);

    const result = await requestKeySystemAccess(['com.microsoft.playready'], { video: [], audio: [] });

    expect(spy.mock.calls.map(([keySystem]) => keySystem)).toEqual([
      'com.microsoft.playready.recommendation',
      'com.microsoft.playready',
    ]);
    expect(result).toEqual({ keySystem: 'com.microsoft.playready', access });
    spy.mockRestore();
  });
});

describe('toCencInitData', () => {
  const payload = new Uint8Array([1, 2, 3, 4]);
  const pssh = (() => {
    // A minimal well-formed v0 PSSH box wrapping `payload`.
    const box = new Uint8Array(36);
    new DataView(box.buffer).setUint32(0, 36);
    box.set([0x70, 0x73, 0x73, 0x68], 4); // 'pssh'
    new DataView(box.buffer).setUint32(28, 4);
    box.set(payload, 32);
    return box;
  })();

  it('passes Widevine data through untouched — Mux ships a complete PSSH', () => {
    expect(toCencInitData('com.widevine.alpha', pssh)).toBe(pssh);
  });

  it('wraps a raw PlayReady Object into a v0 PSSH box', () => {
    const wrapped = toCencInitData('com.microsoft.playready', payload);

    expect(wrapped.length).toBe(32 + payload.length);
    expect(new DataView(wrapped.buffer).getUint32(0)).toBe(wrapped.length);
    expect([...wrapped.slice(4, 8)]).toEqual([0x70, 0x73, 0x73, 0x68]); // 'pssh'
    expect(new DataView(wrapped.buffer).getUint32(8)).toBe(0); // v0, no flags
    // The PlayReady system id, 9a04f079-9840-4286-ab92-e65be0885f95.
    expect([...wrapped.slice(12, 16)]).toEqual([0x9a, 0x04, 0xf0, 0x79]);
    expect(new DataView(wrapped.buffer).getUint32(28)).toBe(payload.length);
    expect([...wrapped.slice(32)]).toEqual([...payload]);
  });

  it('leaves an already-PSSH PlayReady declaration alone', () => {
    expect(toCencInitData('com.microsoft.playready', pssh)).toBe(pssh);
  });
});

describe('shapeLicenseRequest', () => {
  const utf16 = (text: string) => {
    const bytes = new Uint8Array(text.length * 2);
    for (let i = 0; i < text.length; i++) new DataView(bytes.buffer).setUint16(i * 2, text.charCodeAt(i), true);
    return bytes;
  };

  it('passes non-PlayReady messages through as octet-stream', () => {
    const message = new Uint8Array([1, 2, 3]).buffer;
    const shaped = shapeLicenseRequest('com.widevine.alpha', message);

    expect(shaped.body).toBe(message);
    expect(shaped.headers).toEqual({ 'Content-Type': 'application/octet-stream' });
  });

  it('unwraps a PlayReadyKeyMessage envelope into headers and the decoded challenge', () => {
    // btoa('challenge!') carried inside the classic UTF-16 XML envelope.
    const envelope = utf16(
      '<PlayReadyKeyMessage><LicenseAcquisition Version="1">' +
        '<Challenge encoding="base64encoded">Y2hhbGxlbmdlIQ==</Challenge>' +
        '<HttpHeaders><HttpHeader><name>Content-Type</name><value>text/xml; charset=utf-8</value></HttpHeader>' +
        '<HttpHeader><name>SOAPAction</name><value>AcquireLicense</value></HttpHeader></HttpHeaders>' +
        '</LicenseAcquisition></PlayReadyKeyMessage>'
    );
    const shaped = shapeLicenseRequest('com.microsoft.playready', envelope.buffer);

    expect(new TextDecoder().decode(shaped.body as ArrayBuffer | Uint8Array)).toBe('challenge!');
    expect(shaped.headers).toEqual({ 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'AcquireLicense' });
  });

  it('sends an unwrapped PlayReady challenge as XML — modern CDMs skip the envelope', () => {
    const raw = utf16('<soap:Envelope>raw challenge</soap:Envelope>');
    const shaped = shapeLicenseRequest('com.microsoft.playready', raw.buffer);

    expect(shaped.body).toBe(raw.buffer);
    expect(shaped.headers).toEqual({ 'Content-Type': 'text/xml; charset=utf-8' });
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

  it('resolves a function-valued license server', () => {
    expect(
      keySystemCandidates([WIDEVINE_KEY], {
        'com.widevine.alpha': { licenseUrl: () => 'https://license.example.com/widevine' },
      })
    ).toEqual(['com.widevine.alpha']);
  });

  it('omits a declared system whose license server resolves to nothing', () => {
    // The per-source "not licensable" signal: the entry names the system, but
    // the current source has no credentials for it, so it prunes exactly as an
    // unnamed system does.
    expect(
      keySystemCandidates([WIDEVINE_KEY, FAIRPLAY_KEY], {
        'com.widevine.alpha': { licenseUrl: undefined },
        'com.apple.fps': { licenseUrl: () => undefined },
      })
    ).toEqual([]);
  });

  it('treats a throwing resolver as no configured license server', () => {
    expect(
      keySystemCandidates([WIDEVINE_KEY], {
        'com.widevine.alpha': {
          licenseUrl: () => {
            throw new Error('no token yet');
          },
        },
      })
    ).toEqual([]);
  });
});

describe('unplayableEncryptedTypes', () => {
  // `encrypted` is derived and stored by `parseMediaPlaylist`, so it is set
  // explicitly here rather than inferred from a key list.
  const track = (type: 'video' | 'audio', encrypted: boolean) => ({
    type,
    id: `${type}-${encrypted}`,
    url: `https://example.com/${type}.m3u8`,
    bandwidth: 1000,
    mimeType: `${type}/mp4`,
    codecs: [type === 'video' ? 'avc1.4d401f' : 'mp4a.40.2'],
    segments: [{ id: 's0', url: 'https://example.com/0.m4s', startTime: 0, duration: 4 }],
    startTime: 0,
    duration: 4,
    metadata: { mediaPlaylist: { targetDuration: 4, mediaSequence: 0, endList: true, encrypted } },
  });

  const presentationOf = (tracks: object[]) =>
    ({
      id: 'p1',
      url: 'https://example.com/multivariant.m3u8',
      selectionSets: [
        { id: 's', type: 'video' as const, switchingSets: [{ id: 'sw', type: 'video' as const, tracks }] },
      ],
    }) as never;

  it('names a type whose every resolved rendition is encrypted', () => {
    expect(unplayableEncryptedTypes(presentationOf([track('video', true), track('video', true)]))).toEqual(['video']);
  });

  it('spares a type keeping any clear rendition', () => {
    expect(unplayableEncryptedTypes(presentationOf([track('video', true), track('video', false)]))).toEqual([]);
  });

  it('reports each type independently — Mux encrypts video and leaves audio clear', () => {
    expect(unplayableEncryptedTypes(presentationOf([track('video', true), track('audio', false)]))).toEqual(['video']);
  });

  it('names both types when neither has anything clear', () => {
    expect(unplayableEncryptedTypes(presentationOf([track('video', true), track('audio', true)]))).toEqual([
      'video',
      'audio',
    ]);
  });

  it('names nothing when no rendition has resolved', () => {
    expect(unplayableEncryptedTypes(presentationOf([]))).toEqual([]);
    expect(unplayableEncryptedTypes(undefined)).toEqual([]);
  });
});

describe('resolveDrmUrl', () => {
  it('passes a plain value through, including undefined', () => {
    expect(resolveDrmUrl('https://license.example.com/widevine')).toBe('https://license.example.com/widevine');
    expect(resolveDrmUrl(undefined)).toBeUndefined();
  });

  it('calls a resolver and returns what it yields', () => {
    expect(resolveDrmUrl(() => 'https://license.example.com/fairplay')).toBe('https://license.example.com/fairplay');
    expect(resolveDrmUrl(() => undefined)).toBeUndefined();
  });

  it('answers undefined when the resolver throws', () => {
    expect(
      resolveDrmUrl(() => {
        throw new Error('no token yet');
      })
    ).toBeUndefined();
  });
});

describe('buildKeySystemConfigurations', () => {
  it('builds one configuration with per-type capabilities from track content types', () => {
    const [config] = buildKeySystemConfigurations('com.widevine.alpha', {
      video: ['video/mp4; codecs="avc1.4d401f"'],
      audio: ['audio/mp4; codecs="mp4a.40.2"'],
    });

    expect(config?.initDataTypes).toEqual(['cenc']);
    expect(config?.videoCapabilities).toEqual([{ contentType: 'video/mp4; codecs="avc1.4d401f"' }]);
    expect(config?.audioCapabilities).toEqual([{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }]);
  });

  it('asks FairPlay for its own init-data types — Safari rejects cenc-only', () => {
    const [config] = buildKeySystemConfigurations('com.apple.fps', {
      video: ['video/mp4; codecs="avc1.4d401f"'],
      audio: [],
    });

    expect(config?.initDataTypes).toEqual(['sinf', 'cenc']);
  });

  it('stamps the declared encryption scheme on every capability', () => {
    const [config] = buildKeySystemConfigurations(
      'com.widevine.alpha',
      { video: ['video/mp4; codecs="avc1.4d401f"'], audio: ['audio/mp4; codecs="mp4a.40.2"'] },
      'cbcs'
    );

    expect(config?.videoCapabilities).toEqual([
      { contentType: 'video/mp4; codecs="avc1.4d401f"', encryptionScheme: 'cbcs' },
    ]);
    expect(config?.audioCapabilities).toEqual([
      { contentType: 'audio/mp4; codecs="mp4a.40.2"', encryptionScheme: 'cbcs' },
    ]);
  });

  it('omits a capability list when that type has no content types', () => {
    const [config] = buildKeySystemConfigurations('com.widevine.alpha', {
      video: ['video/mp4; codecs="avc1.4d401f"'],
      audio: [],
    });

    expect(config?.videoCapabilities).toHaveLength(1);
    expect(config?.audioCapabilities).toBeUndefined();
  });
});
