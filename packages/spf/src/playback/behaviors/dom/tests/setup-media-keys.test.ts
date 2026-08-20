import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import { attachMediaKeys, fetchLicense, requestKeySystemAccess } from '../../../../media/dom/eme';
import {
  SVTA_BAD_LICENSE_REQUEST,
  SVTA_DRM_LICENSE_REJECTED,
  SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED,
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

const DRM_CONFIG = {
  'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' },
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

function setupSetupMediaKeys(initialState: MediaKeysState = {}, initialContext: MediaKeysContext = {}) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const reactor = setupMediaKeys.setup({ state, context, config: { drm: DRM_CONFIG } });
  return { state, context, reactor };
}

describe('setupMediaKeys', () => {
  beforeEach(() => {
    vi.mocked(requestKeySystemAccess).mockReset();
    vi.mocked(attachMediaKeys).mockReset().mockResolvedValue(undefined);
    vi.mocked(fetchLicense).mockReset();
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
    // Widevine), with capabilities built from the presentation's codecs.
    expect(requestKeySystemAccess).toHaveBeenCalledWith(
      ['com.apple.fps', 'com.widevine.alpha'],
      [expect.objectContaining({ videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.4d401f"' }] })]
    );
    expect(attachMediaKeys).toHaveBeenCalledWith(video, eme.mediaKeys);
    expect(state.awaitingMediaKeys.get()).toBe(false);

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
    expect(fetchLicense).toHaveBeenCalledWith(DRM_CONFIG['com.widevine.alpha'].licenseUrl, message, expect.anything());

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
