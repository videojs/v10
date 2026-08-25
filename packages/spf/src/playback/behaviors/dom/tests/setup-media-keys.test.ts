import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import {
  attachMediaKeys,
  type DrmSystemsConfig,
  fetchLicense,
  fetchServerCertificate,
  requestKeySystemAccess,
} from '../../../../media/dom/eme';
import {
  SVTA_BAD_LICENSE_REQUEST,
  SVTA_DRM_CERTIFICATE_ERROR,
  SVTA_DRM_LICENSE_REJECTED,
  SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED,
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  type SvtaError,
} from '../../../../media/errors';
import type { Presentation } from '../../../../media/types';
import { type MediaKeysContext, type MediaKeysState, setupMediaKeys } from '../setup-media-keys';

// Mock the DOM-touching seams while keeping the pure helpers (candidate
// selection, init-data decoding, declared-key collection) real — the behavior
// is exercised against real manifest-shaped fixtures.
vi.mock('../../../../media/dom/eme', async () => {
  const actual = await vi.importActual<typeof import('../../../../media/dom/eme')>('../../../../media/dom/eme');
  return {
    ...actual,
    requestKeySystemAccess: vi.fn(),
    attachMediaKeys: vi.fn(async () => {}),
    fetchLicense: vi.fn(),
    fetchServerCertificate: vi.fn(),
  };
});

// "ping" in base64 — stand-in for a Widevine PSSH payload.
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
// A raw PlayReady Object stand-in — NOT a PSSH box, exactly as Mux authors it.
const PLAYREADY_KEY = {
  method: 'SAMPLE-AES',
  uri: `data:text/plain;charset=UTF-16;base64,${PSSH_BASE64}`,
  keyFormat: 'com.microsoft.playready',
};

const DRM_CONFIG = {
  'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' },
  'com.microsoft.playready': { licenseUrl: 'https://license.example.com/playready' },
  'com.apple.fps': {
    licenseUrl: 'https://license.example.com/fairplay',
    serverCertificateUrl: 'https://license.example.com/appcert',
  },
};

function makePresentation(keys?: object[]): Presentation {
  return {
    id: 'p1',
    url: 'https://example.com/multivariant.m3u8',
    selectionSets: [
      {
        id: 'ss1',
        type: 'video' as const,
        switchingSets: [
          {
            id: 'sw1',
            type: 'video' as const,
            tracks: [
              {
                type: 'video' as const,
                id: 'v-1',
                url: 'https://example.com/v.m3u8',
                bandwidth: 1000,
                mimeType: 'video/mp4',
                codecs: ['avc1.4d401f'],
                segments: [{ id: 's0', url: 'https://example.com/0.m4s', startTime: 0, duration: 4 }],
                startTime: 0,
                duration: 4,
                ...(keys && {
                  metadata: { mediaPlaylist: { targetDuration: 4, mediaSequence: 0, endList: true, keys } },
                }),
              },
            ],
          },
        ],
      },
    ],
  } as Presentation;
}

interface FakeSession extends EventTarget {
  generateRequest: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

function makeFakeSession(): FakeSession {
  const session = new EventTarget() as FakeSession;
  session.generateRequest = vi.fn(async () => {});
  session.update = vi.fn(async () => {});
  session.close = vi.fn(async () => {});
  return session;
}

function makeFakeEme(keySystem = 'com.widevine.alpha') {
  const sessions: FakeSession[] = [];
  const mediaKeys = {
    createSession: vi.fn(() => {
      const session = makeFakeSession();
      sessions.push(session);
      return session;
    }),
    setServerCertificate: vi.fn(async () => true),
  } as unknown as MediaKeys;
  const access = { createMediaKeys: vi.fn(async () => mediaKeys) } as unknown as MediaKeySystemAccess;
  return { keySystem, access, mediaKeys, sessions };
}

function makeState(initial: MediaKeysState = {}) {
  return {
    presentation: signal<MediaKeysState['presentation']>(initial.presentation),
    awaitingMediaKeys: signal<boolean | undefined>(initial.awaitingMediaKeys),
    // Optional reporter seam (ErrorEmitterState) — present here to simulate a
    // composition where collectErrors owns the slot.
    errors: signal<SvtaError[] | undefined>(undefined),
  };
}

function makeContext(initial: MediaKeysContext = {}) {
  return {
    mediaElement: signal<HTMLMediaElement | undefined>(initial.mediaElement),
    mediaKeys: signal<MediaKeys | undefined>(initial.mediaKeys),
  };
}

function setupSetupMediaKeys(
  initialState: MediaKeysState = {},
  initialContext: MediaKeysContext = {},
  drm: DrmSystemsConfig = DRM_CONFIG
) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const reactor = setupMediaKeys.setup({ state, context, config: { drm } });
  return { state, context, reactor };
}

describe('setupMediaKeys', () => {
  beforeEach(() => {
    vi.mocked(requestKeySystemAccess).mockReset();
    vi.mocked(attachMediaKeys).mockReset().mockResolvedValue(undefined);
    vi.mocked(fetchLicense).mockReset();
    vi.mocked(fetchServerCertificate)
      .mockReset()
      .mockResolvedValue(new Uint8Array([7, 7]));
  });

  it('stays out while preconditions are unmet or the source declares no keys', async () => {
    // No media element.
    const noElement = setupSetupMediaKeys({ presentation: makePresentation([WIDEVINE_KEY]) });
    // Clear source: resolved, but no key declarations.
    const clearSource = setupSetupMediaKeys(
      { presentation: makePresentation() },
      { mediaElement: document.createElement('video') }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requestKeySystemAccess).not.toHaveBeenCalled();
    expect(noElement.state.awaitingMediaKeys.get()).toBeFalsy();
    expect(clearSource.state.awaitingMediaKeys.get()).toBeFalsy();

    noElement.reactor.destroy();
    clearSource.reactor.destroy();
  });

  it('raises the gate, negotiates in preference order, attaches, publishes, lowers the gate', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const video = document.createElement('video');
    const { state, context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY, FAIRPLAY_KEY]) },
      { mediaElement: video }
    );

    // The gate is up before any async EME work resolves.
    await vi.waitFor(() => expect(state.awaitingMediaKeys.get()).toBe(true));

    await vi.waitFor(() => expect(context.mediaKeys.get()).toBe(eme.mediaKeys));
    // Declared ∩ configured, in fixed preference order (FairPlay outranks
    // Widevine), over the presentation's content types and the encryption
    // scheme its SAMPLE-AES keys declare.
    expect(requestKeySystemAccess).toHaveBeenCalledWith(
      ['com.apple.fps', 'com.widevine.alpha'],
      { video: ['video/mp4; codecs="avc1.4d401f"'], audio: [] },
      'cbcs'
    );
    expect(attachMediaKeys).toHaveBeenCalledWith(video, eme.mediaKeys);
    expect(state.awaitingMediaKeys.get()).toBe(false);

    reactor.destroy();
  });

  it('wraps a raw PlayReady Object into a PSSH box before generating the request', async () => {
    const eme = makeFakeEme('com.microsoft.playready');
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([PLAYREADY_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    const [initDataType, initData] = eme.sessions[0]!.generateRequest.mock.calls[0]! as [string, Uint8Array];
    expect(initDataType).toBe('cenc');
    expect(initData.length).toBe(32 + PSSH_BYTES.length);
    expect([...initData.slice(4, 8)]).toEqual([0x70, 0x73, 0x73, 0x68]); // 'pssh'
    expect([...initData.slice(32)]).toEqual([...PSSH_BYTES]);

    reactor.destroy();
  });

  it('fetches and applies the server certificate before opening sessions', async () => {
    const eme = makeFakeEme('com.apple.fps');
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY, FAIRPLAY_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(context.mediaKeys.get()).toBe(eme.mediaKeys));
    expect(fetchServerCertificate).toHaveBeenCalledWith(
      DRM_CONFIG['com.apple.fps'].serverCertificateUrl,
      expect.anything()
    );
    expect(eme.mediaKeys.setServerCertificate).toHaveBeenCalledWith(new Uint8Array([7, 7]));

    reactor.destroy();
  });

  it('reports 4013 and holds the gate when the certificate phase fails', async () => {
    const eme = makeFakeEme('com.apple.fps');
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(fetchServerCertificate).mockRejectedValue(new Error('appcert 403'));
    const { state, context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([FAIRPLAY_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() =>
      expect(state.errors.get()?.map((error) => error.code)).toEqual([SVTA_DRM_CERTIFICATE_ERROR])
    );
    expect(state.awaitingMediaKeys.get()).toBe(true);
    expect(context.mediaKeys.get()).toBeUndefined();
    expect(attachMediaKeys).not.toHaveBeenCalled();

    reactor.destroy();
  });

  it('opens event-driven sessions when the manifest carries no init data, deduped by bytes', async () => {
    const eme = makeFakeEme('com.apple.fps');
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const video = document.createElement('video');
    const { context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([FAIRPLAY_KEY]) },
      { mediaElement: video }
    );

    // skd:// carries no inline init data, so no manifest-driven session opens.
    await vi.waitFor(() => expect(context.mediaKeys.get()).toBe(eme.mediaKeys));
    expect(eme.sessions).toHaveLength(0);

    const sinf = new Uint8Array([5, 5, 5]);
    const fireEncrypted = (bytes: Uint8Array) =>
      video.dispatchEvent(Object.assign(new Event('encrypted'), { initDataType: 'sinf', initData: bytes.buffer }));

    fireEncrypted(sinf);
    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    expect(eme.sessions[0]!.generateRequest).toHaveBeenCalledWith('sinf', sinf);

    // The same init data again (the other track of a muxed pair, a re-append)
    // opens nothing; different init data opens a second session.
    fireEncrypted(sinf);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(eme.sessions).toHaveLength(1);

    fireEncrypted(new Uint8Array([6, 6, 6]));
    await vi.waitFor(() => expect(eme.sessions).toHaveLength(2));

    reactor.destroy();
  });

  it('ignores encrypted events when manifest-driven sessions exist', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const video = document.createElement('video');
    const { reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: video }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    video.dispatchEvent(
      Object.assign(new Event('encrypted'), { initDataType: 'cenc', initData: new Uint8Array([1]).buffer })
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(eme.sessions).toHaveLength(1);

    reactor.destroy();
  });

  it('opens one session per manifest-carried init data and skips skd:// keys', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY, FAIRPLAY_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    expect(eme.sessions[0]!.generateRequest).toHaveBeenCalledWith('cenc', PSSH_BYTES);

    reactor.destroy();
  });

  it("exchanges the chosen system's license on a session message", async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const license = new Uint8Array([9, 9, 9]);
    vi.mocked(fetchLicense).mockResolvedValue(license);
    const { reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    const message = new Uint8Array([1, 2, 3]).buffer;
    eme.sessions[0]!.dispatchEvent(Object.assign(new Event('message'), { message }));

    await vi.waitFor(() => expect(eme.sessions[0]!.update).toHaveBeenCalledWith(license));
    expect(fetchLicense).toHaveBeenCalledWith(DRM_CONFIG['com.widevine.alpha'].licenseUrl, message, expect.anything(), {
      'Content-Type': 'application/octet-stream',
    });

    reactor.destroy();
  });

  it('resolves a function-valued license server when the exchange runs', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(fetchLicense).mockResolvedValue(new Uint8Array([9]));
    // The Mux flavor's shape: the Media holds the source, so the URL is not
    // known when the engine is constructed.
    const licenseUrl = vi.fn(() => 'https://license.example.com/minted');
    const { reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') },
      { 'com.widevine.alpha': { licenseUrl } }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    const message = new Uint8Array([1, 2, 3]).buffer;
    eme.sessions[0]!.dispatchEvent(Object.assign(new Event('message'), { message }));

    await vi.waitFor(() =>
      expect(fetchLicense).toHaveBeenCalledWith(
        'https://license.example.com/minted',
        message,
        expect.anything(),
        expect.anything()
      )
    );

    reactor.destroy();
  });

  it('resolves a function-valued server certificate', async () => {
    const eme = makeFakeEme('com.apple.fps');
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([FAIRPLAY_KEY]) },
      { mediaElement: document.createElement('video') },
      {
        'com.apple.fps': {
          licenseUrl: () => 'https://license.example.com/fairplay',
          serverCertificateUrl: () => 'https://license.example.com/minted-appcert',
        },
      }
    );

    await vi.waitFor(() => expect(context.mediaKeys.get()).toBe(eme.mediaKeys));
    expect(fetchServerCertificate).toHaveBeenCalledWith(
      'https://license.example.com/minted-appcert',
      expect.anything()
    );

    reactor.destroy();
  });

  it('skips the certificate phase when its resolver yields nothing', async () => {
    const eme = makeFakeEme('com.apple.fps');
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([FAIRPLAY_KEY]) },
      { mediaElement: document.createElement('video') },
      {
        'com.apple.fps': {
          licenseUrl: () => 'https://license.example.com/fairplay',
          serverCertificateUrl: () => undefined,
        },
      }
    );

    // Same as naming no certificate URL at all: attachment proceeds rather than
    // parking the source.
    await vi.waitFor(() => expect(context.mediaKeys.get()).toBe(eme.mediaKeys));
    expect(fetchServerCertificate).not.toHaveBeenCalled();

    reactor.destroy();
  });

  // `makePresentation` leaves `encrypted` unset, which is what a rendition looks
  // like before its playlist is parsed. These two pin the verdict on a
  // presentation that has actually resolved as encrypted.
  function makeEncryptedPresentation(types: Array<'video' | 'audio'>, keys: object[]): Presentation {
    return {
      id: 'p1',
      url: 'https://example.com/multivariant.m3u8',
      selectionSets: types.map((type, i) => ({
        id: `ss-${type}`,
        type,
        switchingSets: [
          {
            id: `sw-${type}`,
            type,
            tracks: [
              {
                type,
                id: `${type}-${i}`,
                url: `https://example.com/${type}.m3u8`,
                bandwidth: 1000,
                mimeType: `${type}/mp4`,
                codecs: [type === 'video' ? 'avc1.4d401f' : 'mp4a.40.2'],
                segments: [{ id: 's0', url: 'https://example.com/0.m4s', startTime: 0, duration: 4 }],
                startTime: 0,
                duration: 4,
                metadata: {
                  mediaPlaylist: { targetDuration: 4, mediaSequence: 0, endList: true, keys, encrypted: true },
                },
              },
            ],
          },
        ],
      })),
    } as unknown as Presentation;
  }

  it('follows 4008 with a per-type verdict when every rendition needs the CDM it could not get', async () => {
    vi.mocked(requestKeySystemAccess).mockResolvedValue(undefined);
    const { state, reactor } = setupSetupMediaKeys(
      { presentation: makeEncryptedPresentation(['video', 'audio'], [WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    // Without the verdicts the adapter has no fatal condition and the source
    // parks silently — the cause alone never reaches `media.error`.
    await vi.waitFor(() =>
      expect(state.errors.get()?.map((error) => error.code)).toEqual([
        SVTA_UNSUPPORTED_DRM_SYSTEM,
        SVTA_NO_SUPPORTED_VIDEO_TRACK,
        SVTA_NO_SUPPORTED_AUDIO_TRACK,
      ])
    );

    reactor.destroy();
  });

  it('reports only the cause when a type keeps a clear rendition', async () => {
    vi.mocked(requestKeySystemAccess).mockResolvedValue(undefined);
    // Mux's shape: encrypted video, clear audio. Audio still plays, so a verdict
    // for it would be wrong.
    const presentation = makeEncryptedPresentation(['video'], [WIDEVINE_KEY]);
    const { state, reactor } = setupSetupMediaKeys({ presentation }, { mediaElement: document.createElement('video') });

    await vi.waitFor(() => expect(state.errors.get()?.length).toBe(2));
    expect(state.errors.get()?.map((error) => error.code)).toEqual([
      SVTA_UNSUPPORTED_DRM_SYSTEM,
      SVTA_NO_SUPPORTED_VIDEO_TRACK,
    ]);

    reactor.destroy();
  });

  it("sends a key system's configured headers with its license request", async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(fetchLicense).mockResolvedValue(new Uint8Array([9]));
    const { reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') },
      {
        'com.widevine.alpha': {
          licenseUrl: 'https://license.example.com/widevine',
          headers: { 'X-AxDRM-Message': 'entitlement', 'X-Extra': 'kept' },
        },
      }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    eme.sessions[0]!.dispatchEvent(Object.assign(new Event('message'), { message: new Uint8Array([1]).buffer }));

    await vi.waitFor(() =>
      expect(fetchLicense).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), {
        // Merged with, not replacing, the content type the request already needs.
        'Content-Type': 'application/octet-stream',
        'X-AxDRM-Message': 'entitlement',
        'X-Extra': 'kept',
      })
    );

    reactor.destroy();
  });

  it('lets the shaped request win over a configured header of the same name', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(fetchLicense).mockResolvedValue(new Uint8Array([9]));
    const { reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') },
      {
        'com.widevine.alpha': {
          licenseUrl: 'https://license.example.com/widevine',
          // A CDM naming its own Content-Type is not negotiable.
          headers: { 'Content-Type': 'application/json' },
        },
      }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    eme.sessions[0]!.dispatchEvent(Object.assign(new Event('message'), { message: new Uint8Array([1]).buffer }));

    await vi.waitFor(() =>
      expect(fetchLicense).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), {
        'Content-Type': 'application/octet-stream',
      })
    );

    reactor.destroy();
  });

  it('holds the gate and reports 4008 when no configured key system is usable', async () => {
    vi.mocked(requestKeySystemAccess).mockResolvedValue(undefined);
    const { state, context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(requestKeySystemAccess).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.awaitingMediaKeys.get()).toBe(true);
    expect(context.mediaKeys.get()).toBeUndefined();
    expect(state.errors.get()).toEqual([
      { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { keySystems: ['com.widevine.alpha'] } },
    ]);

    reactor.destroy();
  });

  it('reports 4004 when the license request fails, without dropping the session', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(fetchLicense).mockRejectedValue(new Error('license server said no'));
    const { state, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    eme.sessions[0]!.dispatchEvent(Object.assign(new Event('message'), { message: new Uint8Array([1]).buffer }));

    await vi.waitFor(() => expect(state.errors.get()?.map((error) => error.code)).toEqual([SVTA_BAD_LICENSE_REQUEST]));
    expect(state.errors.get()?.[0]?.data).toMatchObject({ keySystem: 'com.widevine.alpha' });
    expect(eme.sessions[0]!.update).not.toHaveBeenCalled();

    reactor.destroy();
  });

  it('reports 4016 when the CDM rejects the license', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(fetchLicense).mockResolvedValue(new Uint8Array([9]));
    const { state, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    eme.sessions[0]!.update.mockRejectedValue(new TypeError('bad CKC'));
    eme.sessions[0]!.dispatchEvent(Object.assign(new Event('message'), { message: new Uint8Array([1]).buffer }));

    await vi.waitFor(() => expect(state.errors.get()?.map((error) => error.code)).toEqual([SVTA_DRM_LICENSE_REJECTED]));

    reactor.destroy();
  });

  it('reports 4021 when the CDM cannot generate a license request', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const failingSession = makeFakeSession();
    failingSession.generateRequest.mockRejectedValue(new Error('no CDM for you'));
    (eme.mediaKeys.createSession as ReturnType<typeof vi.fn>).mockReturnValue(failingSession);
    const { state, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() =>
      expect(state.errors.get()?.map((error) => error.code)).toEqual([SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED])
    );

    reactor.destroy();
  });

  it('reports nothing after teardown aborts in-flight license work', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    let rejectLicense!: (reason: Error) => void;
    vi.mocked(fetchLicense).mockImplementation(() => new Promise((_resolve, reject) => (rejectLicense = reject)));
    const { state, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    eme.sessions[0]!.dispatchEvent(Object.assign(new Event('message'), { message: new Uint8Array([1]).buffer }));
    await vi.waitFor(() => expect(fetchLicense).toHaveBeenCalled());

    state.presentation.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    rejectLicense(new Error('aborted'));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.errors.get() ?? []).toEqual([]);

    reactor.destroy();
  });

  it('closes sessions, detaches, and clears its slots on source clear', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const video = document.createElement('video');
    const { state, context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: video }
    );

    await vi.waitFor(() => expect(context.mediaKeys.get()).toBe(eme.mediaKeys));
    vi.mocked(attachMediaKeys).mockClear();

    state.presentation.set(undefined);

    await vi.waitFor(() => expect(context.mediaKeys.get()).toBeUndefined());
    expect(eme.sessions[0]!.close).toHaveBeenCalled();
    expect(attachMediaKeys).toHaveBeenCalledWith(video, null);
    expect(state.awaitingMediaKeys.get()).toBe(false);

    reactor.destroy();
  });

  it('tears down on destroy', async () => {
    const eme = makeFakeEme();
    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const video = document.createElement('video');
    const { context, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: video }
    );

    await vi.waitFor(() => expect(context.mediaKeys.get()).toBe(eme.mediaKeys));
    reactor.destroy();

    await vi.waitFor(() => expect(context.mediaKeys.get()).toBeUndefined());
    expect(eme.sessions[0]!.close).toHaveBeenCalled();
    expect(attachMediaKeys).toHaveBeenCalledWith(video, null);
  });
});
