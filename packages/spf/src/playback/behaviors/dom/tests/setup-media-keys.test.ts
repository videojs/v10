import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { signal } from '../../../../core/signals/primitives';
import {
  attachMediaKeys,
  type DrmSystemsConfig,
  fetchServerCertificate,
  NO_KEY_SYSTEM,
  requestKeySystemAccess,
} from '../../../../media/dom/eme';
import {
  DEFAULT_KEY_SYSTEMS,
  fairPlayKeySystem,
  playReadyKeySystem,
  widevineKeySystem,
} from '../../../../media/dom/key-systems';
import { SVTA_DRM_CERTIFICATE_ERROR, SVTA_UNSUPPORTED_DRM_SYSTEM, type SvtaError } from '../../../../media/errors';
import type { Presentation } from '../../../../media/types';
import { type MediaKeysContext, type MediaKeysState, setupMediaKeys } from '../setup-media-keys';

// Mock the DOM-touching seams while keeping the pure helpers (candidate
// selection, key-system modules, declared-key collection) real — the behavior
// is exercised against real manifest-shaped fixtures.
vi.mock('../../../../media/dom/eme', async () => {
  const actual = await vi.importActual<typeof import('../../../../media/dom/eme')>('../../../../media/dom/eme');

  return {
    ...actual,
    requestKeySystemAccess: vi.fn(),
    attachMediaKeys: vi.fn(async () => {}),
    fetchServerCertificate: vi.fn(),
  };
});

// "ping" in base64 — stand-in for a Widevine PSSH payload.
const PSSH_BASE64 = 'cGluZw==';

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
  'com.microsoft.playready': { licenseUrl: 'https://license.example.com/playready' },
  'com.apple.fps': {
    licenseUrl: 'https://license.example.com/fairplay',
    serverCertificateUrl: 'https://license.example.com/appcert',
  },
};

const MODULE_BY_KEY_SYSTEM = {
  'com.widevine.alpha': widevineKeySystem,
  'com.microsoft.playready': playReadyKeySystem,
  'com.apple.fps': fairPlayKeySystem,
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

function makeFakeEme(keySystem: keyof typeof MODULE_BY_KEY_SYSTEM = 'com.widevine.alpha') {
  const mediaKeys = {
    createSession: vi.fn(),
    setServerCertificate: vi.fn(async () => true),
  } as unknown as MediaKeys;
  const access = { createMediaKeys: vi.fn(async () => mediaKeys) } as unknown as MediaKeySystemAccess;

  return { module: MODULE_BY_KEY_SYSTEM[keySystem], access, mediaKeys };
}

function makeState(initial: MediaKeysState = {}) {
  return {
    presentation: signal<MediaKeysState['presentation']>(initial.presentation),
    segmentLoadingBlocked: signal<boolean | undefined>(initial.segmentLoadingBlocked),
    negotiatedKeySystem: signal<string | undefined>(initial.negotiatedKeySystem),
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
  const reactor = setupMediaKeys.setup({ state, context, config: { drm, keySystems: DEFAULT_KEY_SYSTEMS } });

  return { state, context, reactor };
}

describe('setupMediaKeys', () => {
  beforeEach(() => {
    vi.mocked(requestKeySystemAccess).mockReset();
    vi.mocked(attachMediaKeys).mockReset().mockResolvedValue(undefined);
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
    expect(noElement.state.segmentLoadingBlocked.get()).toBeFalsy();
    expect(clearSource.state.segmentLoadingBlocked.get()).toBeFalsy();

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
    await vi.waitFor(() => expect(state.segmentLoadingBlocked.get()).toBe(true));

    await vi.waitFor(() => expect(context.mediaKeys.get()).toBe(eme.mediaKeys));
    // Declared ∩ configured modules, in `keySystems` order (FairPlay outranks
    // Widevine in the default), over the presentation's content types and the
    // encryption scheme its SAMPLE-AES keys declare.
    expect(requestKeySystemAccess).toHaveBeenCalledWith(
      [fairPlayKeySystem, widevineKeySystem],
      { video: ['video/mp4; codecs="avc1.4d401f"'], audio: [] },
      'cbcs'
    );
    expect(attachMediaKeys).toHaveBeenCalledWith(video, eme.mediaKeys);
    // The licensing handoff: both slots carry the negotiation forward.
    expect(state.negotiatedKeySystem.get()).toBe('com.widevine.alpha');
    expect(state.segmentLoadingBlocked.get()).toBe(false);

    reactor.destroy();
  });

  it('negotiates only the modules the composition carries', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const state = makeState({ presentation: makePresentation([WIDEVINE_KEY, FAIRPLAY_KEY]) });
    const context = makeContext({ mediaElement: document.createElement('video') });
    // A Widevine-only engine: FairPlay is declared by the manifest and
    // configured with a license server, and still never offered.
    const reactor = setupMediaKeys.setup({
      state,
      context,
      config: { drm: DRM_CONFIG, keySystems: [widevineKeySystem] },
    });

    await vi.waitFor(() => expect(requestKeySystemAccess).toHaveBeenCalled());
    expect(requestKeySystemAccess).toHaveBeenCalledWith([widevineKeySystem], expect.anything(), 'cbcs');

    reactor.destroy();
  });

  it('fetches and applies the server certificate before publishing the negotiation', async () => {
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
    expect(state.segmentLoadingBlocked.get()).toBe(true);
    expect(context.mediaKeys.get()).toBeUndefined();
    expect(state.negotiatedKeySystem.get()).toBeUndefined();
    expect(attachMediaKeys).not.toHaveBeenCalled();

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

  it('publishes the refusal sentinel after reporting 4008', async () => {
    vi.mocked(requestKeySystemAccess).mockResolvedValue(undefined);
    const { state, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(state.negotiatedKeySystem.get()).toBe(NO_KEY_SYSTEM));
    // Cause here, verdict elsewhere: publishing the sentinel is what re-fires
    // rendition pruning, where `excludeRefusedKeySystems` drops every encrypted
    // rendition and `track-switching` reports the emptied type. Ordering is
    // load-bearing — the cause must already be in the sequence when the verdict
    // lands.
    expect(state.errors.get()?.map((error) => error.code)).toEqual([SVTA_UNSUPPORTED_DRM_SYSTEM]);

    reactor.destroy();
  });

  it('publishes no sentinel while negotiation is still in flight', async () => {
    // The distinction the sentinel exists for: an unsettled negotiation must not
    // read as a refusal, or pruning would park a source about to license fine.
    let resolveAccess!: (value: undefined) => void;

    vi.mocked(requestKeySystemAccess).mockImplementation(() => new Promise((resolve) => (resolveAccess = resolve)));
    const { state, reactor } = setupSetupMediaKeys(
      { presentation: makePresentation([WIDEVINE_KEY]) },
      { mediaElement: document.createElement('video') }
    );

    await vi.waitFor(() => expect(requestKeySystemAccess).toHaveBeenCalled());
    expect(state.negotiatedKeySystem.get()).toBeUndefined();

    resolveAccess(undefined);
    await vi.waitFor(() => expect(state.negotiatedKeySystem.get()).toBe(NO_KEY_SYSTEM));

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
    expect(state.segmentLoadingBlocked.get()).toBe(true);
    expect(context.mediaKeys.get()).toBeUndefined();
    expect(state.errors.get()).toEqual([
      { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { keySystems: ['com.widevine.alpha'] } },
    ]);

    reactor.destroy();
  });

  it('detaches and clears its slots on source clear', async () => {
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
    expect(attachMediaKeys).toHaveBeenCalledWith(video, null);
    expect(state.negotiatedKeySystem.get()).toBeUndefined();
    expect(state.segmentLoadingBlocked.get()).toBe(false);

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
    expect(attachMediaKeys).toHaveBeenCalledWith(video, null);
  });
});
