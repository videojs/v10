import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { signal } from '../../../../core/signals/primitives';
import {
  attachMediaKeys,
  type DrmSystemsConfig,
  fetchDrm,
  fetchServerCertificate,
  requestKeySystemAccess,
} from '../../../../media/dom/eme';
import { DEFAULT_KEY_SYSTEMS, fairPlayAirPlayKeySystem, widevineKeySystem } from '../../../../media/dom/key-systems';
import {
  SVTA_DRM_CERTIFICATE_ERROR,
  SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  type SvtaError,
} from '../../../../media/errors';
import type { Presentation } from '../../../../media/types';
import {
  type AirPlayFairPlayContext,
  type AirPlayFairPlayState,
  setupAirPlayFairPlay,
} from '../setup-airplay-fairplay';

// Same seams as `setup-media-keys.test.ts`: the DOM- and network-touching calls
// are mocked, the pure helpers (candidate selection, declared-key collection,
// the key-system modules) run real against manifest-shaped fixtures. `fetchDrm`
// is mocked too because the license exchange runs through `openLicenseSession`
// for real here — only the wire is stubbed.
vi.mock('../../../../media/dom/eme', async () => {
  const actual = await vi.importActual<typeof import('../../../../media/dom/eme')>('../../../../media/dom/eme');

  return {
    ...actual,
    requestKeySystemAccess: vi.fn(),
    attachMediaKeys: vi.fn(async () => {}),
    fetchServerCertificate: vi.fn(),
    fetchDrm: vi.fn(),
  };
});

const FAIRPLAY_KEY = {
  method: 'SAMPLE-AES',
  uri: 'skd://mux?keyId=abc',
  keyFormat: 'com.apple.streamingkeydelivery',
};
const WIDEVINE_KEY = {
  method: 'SAMPLE-AES',
  uri: 'data:text/plain;base64,cGluZw==',
  keyFormat: 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
};

const LICENSE_URL = 'https://license.example.com/fairplay';
const CERT_URL = 'https://license.example.com/appcert';

const DRM_CONFIG: DrmSystemsConfig = {
  'com.apple.fps': { licenseUrl: LICENSE_URL, serverCertificateUrl: CERT_URL },
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

type FakeSession = MediaKeySession & {
  generateRequest: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  keyStatuses: Map<BufferSource, MediaKeyStatus>;
};

function makeFakeEme() {
  const sessions: FakeSession[] = [];
  const mediaKeys = {
    createSession: vi.fn(() => {
      const session = new EventTarget() as FakeSession;

      session.generateRequest = vi.fn(async () => {});
      session.update = vi.fn(async () => {});
      session.close = vi.fn(async () => {});
      session.keyStatuses = new Map();
      sessions.push(session);
      return session;
    }),
    setServerCertificate: vi.fn(async () => true),
  } as unknown as MediaKeys;
  const access = { createMediaKeys: vi.fn(async () => mediaKeys) } as unknown as MediaKeySystemAccess;

  return { module: fairPlayAirPlayKeySystem, access, mediaKeys, sessions };
}

/**
 * A composition carrying `setupAirPlay` (the only declarer of `loadingSuspended`) and `setupMediaKeys` (the owner of
 * `context.mediaKeys`). Defaults are a live session over a FairPlay source with the MSE negotiation already yielded —
 * the one state this behavior serves.
 */
function setup(
  overrides: {
    presentation?: AirPlayFairPlayState['presentation'];
    loadingSuspended?: boolean;
    mediaKeys?: MediaKeys;
    drm?: DrmSystemsConfig;
    keySystems?: readonly (typeof widevineKeySystem)[];
  } = {}
) {
  const state = {
    presentation: signal<AirPlayFairPlayState['presentation']>(
      'presentation' in overrides ? overrides.presentation : makePresentation([FAIRPLAY_KEY])
    ),
    loadingSuspended: signal<boolean | undefined>(overrides.loadingSuspended ?? true),
    errors: signal<SvtaError[] | undefined>(undefined),
  };
  const context = {
    mediaElement: signal<AirPlayFairPlayContext['mediaElement']>(document.createElement('video')),
    mediaKeys: signal<MediaKeys | undefined>(overrides.mediaKeys),
  };
  const reactor = setupAirPlayFairPlay.setup({
    state,
    context,
    config: { drm: overrides.drm ?? DRM_CONFIG, keySystems: overrides.keySystems ?? DEFAULT_KEY_SYSTEMS },
  });

  return { state, context, reactor };
}

/** What an AirPlay receiver's key request looks like arriving at the element. */
function receiverRequest(video: HTMLMediaElement, bytes = [1, 2, 3], initDataType = 'skd') {
  video.dispatchEvent(Object.assign(new Event('encrypted'), { initDataType, initData: new Uint8Array(bytes).buffer }));
}

describe('setupAirPlayFairPlay', () => {
  beforeEach(() => {
    vi.mocked(requestKeySystemAccess).mockReset();
    vi.mocked(attachMediaKeys).mockReset().mockResolvedValue(undefined);
    vi.mocked(fetchServerCertificate)
      .mockReset()
      .mockResolvedValue(new Uint8Array([7, 7]));
    vi.mocked(fetchDrm)
      .mockReset()
      .mockResolvedValue(new Uint8Array([9]));
  });

  it('negotiates for skd, applies the certificate, attaches, and licenses the receiver request', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { context, reactor } = setup();
    const video = context.mediaElement.get()!;

    // Nothing happens until the receiver actually asks: a session on a FairPlay
    // source is not itself evidence it wants anything from this CDM.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requestKeySystemAccess).not.toHaveBeenCalled();

    receiverRequest(video);

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));

    // `skd`, against the manifest rather than a codec — the receiver plays the
    // native-HLS fallback, so the MSE renditions say nothing about its decode.
    expect(requestKeySystemAccess).toHaveBeenCalledWith(
      [fairPlayAirPlayKeySystem],
      { video: ['application/vnd.apple.mpegurl'], audio: [] },
      undefined
    );
    // Certificate before any generateRequest, carried by the shared promise.
    expect(eme.mediaKeys.setServerCertificate).toHaveBeenCalledWith(new Uint8Array([7, 7]));
    expect(attachMediaKeys).toHaveBeenCalledWith(video, eme.mediaKeys);
    expect(eme.sessions[0]!.generateRequest).toHaveBeenCalledWith('skd', new Uint8Array([1, 2, 3]));

    reactor.destroy();
  });

  it('opens a session per receiver request, including a byte-identical repeat', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { context, reactor } = setup();
    const video = context.mediaElement.get()!;

    // The receiver proxies its own SPC on connect and again on disconnect.
    // Deduping by init-data bytes — right for MSE — would strand the second.
    receiverRequest(video, [1, 2, 3]);
    receiverRequest(video, [1, 2, 3]);

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(2));
    // One negotiation, shared.
    expect(requestKeySystemAccess).toHaveBeenCalledTimes(1);

    reactor.destroy();
  });

  it('ignores sinf requests, which belong to the MSE pipeline', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { context, reactor } = setup();

    receiverRequest(context.mediaElement.get()!, [1, 2, 3], 'sinf');

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requestKeySystemAccess).not.toHaveBeenCalled();
    expect(eme.sessions).toHaveLength(0);

    reactor.destroy();
  });

  it('never writes context.mediaKeys, so exchangeLicenses stays parked', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { context, reactor } = setup();

    receiverRequest(context.mediaElement.get()!);

    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));
    expect(context.mediaKeys.get()).toBeUndefined();

    reactor.destroy();
  });

  it('closes its sessions and releases the element when the session ends', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { state, context, reactor } = setup();
    const video = context.mediaElement.get()!;

    receiverRequest(video);
    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));

    // The element reports the keys this behavior attached, so the detach is ours to make.
    Object.defineProperty(video, 'mediaKeys', { value: eme.mediaKeys, configurable: true });
    vi.mocked(attachMediaKeys).mockClear();

    state.loadingSuspended.set(false);

    await vi.waitFor(() => expect(eme.sessions[0]!.close).toHaveBeenCalled());
    expect(attachMediaKeys).toHaveBeenCalledWith(video, null);

    reactor.destroy();
  });

  it('leaves the element alone when MediaKeys it did not attach are on it', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { state, context, reactor } = setup();
    const video = context.mediaElement.get()!;

    receiverRequest(video);
    await vi.waitFor(() => expect(eme.sessions).toHaveLength(1));

    // `setupMediaKeys` re-negotiated off the same falling edge and got there
    // first; detaching now would strip the CDM it just attached.
    Object.defineProperty(video, 'mediaKeys', { value: {} as MediaKeys, configurable: true });
    vi.mocked(attachMediaKeys).mockClear();

    state.loadingSuspended.set(false);

    await vi.waitFor(() => expect(eme.sessions[0]!.close).toHaveBeenCalled());
    expect(attachMediaKeys).not.toHaveBeenCalled();

    reactor.destroy();
  });

  it('reports a refused negotiation and a failed certificate', async () => {
    vi.mocked(requestKeySystemAccess).mockResolvedValue(undefined);
    const refused = setup();

    receiverRequest(refused.context.mediaElement.get()!);
    await vi.waitFor(() => expect(refused.state.errors.get()?.[0]?.code).toBe(SVTA_UNSUPPORTED_DRM_SYSTEM));
    refused.reactor.destroy();

    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(fetchServerCertificate).mockRejectedValue(new Error('appcert 403'));
    const certFailed = setup();

    receiverRequest(certFailed.context.mediaElement.get()!);
    await vi.waitFor(() => expect(certFailed.state.errors.get()?.[0]?.code).toBe(SVTA_DRM_CERTIFICATE_ERROR));
    // Nothing attached, no session opened.
    expect(attachMediaKeys).not.toHaveBeenCalled();
    expect(eme.sessions).toHaveLength(0);

    certFailed.reactor.destroy();
  });

  describe('gating', () => {
    const cases: Array<[string, Parameters<typeof setup>[0]]> = [
      ['no AirPlay session', { loadingSuspended: false }],
      ['setupMediaKeys has not yielded yet', { mediaKeys: {} as MediaKeys }],
      ['an unresolved presentation', { presentation: undefined }],
      ['a source declaring no FairPlay key', { presentation: makePresentation([WIDEVINE_KEY]) }],
      ['no com.apple.fps license server', { drm: { 'com.widevine.alpha': { licenseUrl: 'https://wv.example' } } }],
      ['a composition that carries no FairPlay module', { keySystems: [widevineKeySystem] }],
    ];

    it.each(cases)('stays out with %s', async (_label, overrides) => {
      const eme = makeFakeEme();

      vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
      const { context, reactor } = setup(overrides);

      receiverRequest(context.mediaElement.get()!);

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(requestKeySystemAccess).not.toHaveBeenCalled();
      expect(eme.sessions).toHaveLength(0);

      reactor.destroy();
    });

    it('stays out entirely when no AirPlay bridge declares the slot', async () => {
      const eme = makeFakeEme();

      vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
      // No `loadingSuspended` at all — an engine composed without `setupAirPlay`.
      const state = {
        presentation: signal<AirPlayFairPlayState['presentation']>(makePresentation([FAIRPLAY_KEY])),
        errors: signal<SvtaError[] | undefined>(undefined),
      };
      const video = document.createElement('video');
      const context = {
        mediaElement: signal<AirPlayFairPlayContext['mediaElement']>(video),
        mediaKeys: signal<MediaKeys | undefined>(undefined),
      };
      const reactor = setupAirPlayFairPlay.setup({
        state,
        context,
        config: { drm: DRM_CONFIG, keySystems: DEFAULT_KEY_SYSTEMS },
      });

      receiverRequest(video);

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(requestKeySystemAccess).not.toHaveBeenCalled();

      reactor.destroy();
    });
  });
});

/**
 * The pre-EME key API, installed on `globalThis` and on the element the way Safari exposes it. Returns the sessions it
 * creates so the exchange can be driven and asserted.
 */
function stubWebKitMediaKeys(video: HTMLMediaElement) {
  const sessions: Array<EventTarget & { update: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }> = [];
  const created: Array<{ mimeType: string; initData: Uint8Array }> = [];
  const keys = {
    createSession: vi.fn((mimeType: string, initData: BufferSource) => {
      const session = new EventTarget() as (typeof sessions)[number] & { error: null };

      session.update = vi.fn();
      session.close = vi.fn();
      session.error = null;
      created.push({ mimeType, initData: new Uint8Array(initData as ArrayBuffer) });
      sessions.push(session);
      return session;
    }),
  };

  (globalThis as Record<string, unknown>).WebKitMediaKeys = class {
    constructor(public keySystem: string) {}
  };
  Object.defineProperty(video, 'webkitSetMediaKeys', { value: vi.fn(), configurable: true, writable: true });
  Object.defineProperty(video, 'webkitKeys', { value: keys, configurable: true, writable: true });

  return { sessions, created };
}

/** The exact refusal `generateRequest` raises during an AirPlay session on an affected sender. */
const airPlayRefusal = () => new DOMException('The operation is not supported.', 'NotSupportedError');

function goWireless(video: HTMLMediaElement, wireless: boolean) {
  Object.defineProperty(video, 'webkitCurrentPlaybackTargetIsWireless', {
    value: wireless,
    configurable: true,
    writable: true,
  });
}

/** What the legacy API delivers for the same key: the `skd://` URI as UTF-16LE. */
function legacyInitData(uri = 'skd://mux?keyId=abc'): ArrayBuffer {
  const bytes = new Uint8Array(uri.length * 2);
  const view = new DataView(bytes.buffer);

  for (let i = 0; i < uri.length; i++) view.setUint16(i * 2, uri.charCodeAt(i), true);

  return bytes.buffer;
}

function needKey(video: HTMLMediaElement, initData = legacyInitData()) {
  video.dispatchEvent(Object.assign(new Event('webkitneedkey'), { initData }));
}

describe('setupAirPlayFairPlay legacy fallback', () => {
  beforeEach(() => {
    vi.mocked(requestKeySystemAccess).mockReset();
    vi.mocked(attachMediaKeys).mockReset().mockResolvedValue(undefined);
    vi.mocked(fetchServerCertificate)
      .mockReset()
      .mockResolvedValue(new Uint8Array([7, 7]));
    vi.mocked(fetchDrm)
      .mockReset()
      .mockResolvedValue(new Uint8Array([9]));
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).WebKitMediaKeys;
  });

  /** EME reaches `generateRequest` and is refused, with the legacy API available and its payload already delivered. */
  async function refuseEme() {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const harness = setup();
    const video = harness.context.mediaElement.get()!;

    goWireless(video, true);
    const webkit = stubWebKitMediaKeys(video);

    eme.sessions.push; // keep the fake's shape obvious at the call site
    vi.mocked(eme.mediaKeys.createSession).mockImplementation(() => {
      const session = new EventTarget() as never as MediaKeySession & { generateRequest: ReturnType<typeof vi.fn> };

      (session as { generateRequest: unknown }).generateRequest = vi.fn(async () => {
        throw airPlayRefusal();
      });
      (session as { update: unknown }).update = vi.fn(async () => {});
      (session as { close: unknown }).close = vi.fn(async () => {});
      (session as { keyStatuses: unknown }).keyStatuses = new Map();
      return session;
    });

    // The reload is the handover's first step, so it is stubbed rather than
    // run — a real one in a test element resets nothing useful and races the
    // assertions.
    const load = vi.fn();

    Object.defineProperty(video, 'load', { value: load, configurable: true });

    receiverRequest(video);

    // EME is refused, the element is released, and the resource reloads.
    await vi.waitFor(() => expect(load).toHaveBeenCalled());

    // Only the request delivered *after* that reload can be served: the one
    // from before it belongs to the resource being replaced.
    needKey(video);

    return { ...harness, video, webkit, eme, load };
  }

  it('hands the session to the legacy key system on the AirPlay refusal, and licenses through it', async () => {
    const { webkit, state, reactor, video } = await refuseEme();

    await vi.waitFor(() => expect(webkit.created).toHaveLength(1));

    // Negotiated against the manifest, and the certificate is packed into the
    // session rather than handed to the CDM.
    expect(webkit.created[0]!.mimeType).toBe('application/vnd.apple.mpegurl');
    expect([...webkit.created[0]!.initData].slice(-2)).toEqual([7, 7]);

    // EME released the element before the legacy API claimed it.
    expect(attachMediaKeys).toHaveBeenCalledWith(video, null);

    // The exchange runs through the same fetch and transform layers.
    webkit.sessions[0]!.dispatchEvent(
      Object.assign(new Event('webkitkeymessage'), { message: new Uint8Array([1]).buffer })
    );
    await vi.waitFor(() => expect(webkit.sessions[0]!.update).toHaveBeenCalledWith(new Uint8Array([9])));

    // The refusal it recovered from is not reported: it no longer decides anything.
    expect(state.errors.get() ?? []).toEqual([]);

    reactor.destroy();
  });

  it('ignores the key request delivered before the reload', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    const { context, reactor } = setup();
    const video = context.mediaElement.get()!;

    goWireless(video, true);
    const webkit = stubWebKitMediaKeys(video);

    // Arrives while EME is still the active path, so it belongs to the
    // resource the handover is about to replace.
    needKey(video);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(webkit.created).toHaveLength(0);

    reactor.destroy();
  });

  it('reports 4021 instead of falling back when the legacy API is absent', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(eme.mediaKeys.createSession).mockImplementation(() => {
      const session = new EventTarget() as never as MediaKeySession;

      (session as { generateRequest: unknown }).generateRequest = vi.fn(async () => {
        throw airPlayRefusal();
      });
      (session as { close: unknown }).close = vi.fn(async () => {});
      (session as { keyStatuses: unknown }).keyStatuses = new Map();
      return session;
    });
    const { state, context, reactor } = setup();

    goWireless(context.mediaElement.get()!, true);
    receiverRequest(context.mediaElement.get()!);

    await vi.waitFor(() =>
      expect(state.errors.get()?.map((error) => error.code)).toContain(SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED)
    );

    reactor.destroy();
  });

  it('reports a generateRequest failure that is not the AirPlay refusal', async () => {
    const eme = makeFakeEme();

    vi.mocked(requestKeySystemAccess).mockResolvedValue(eme);
    vi.mocked(eme.mediaKeys.createSession).mockImplementation(() => {
      const session = new EventTarget() as never as MediaKeySession;

      (session as { generateRequest: unknown }).generateRequest = vi.fn(async () => {
        throw new DOMException('bad init data', 'InvalidAccessError');
      });
      (session as { close: unknown }).close = vi.fn(async () => {});
      (session as { keyStatuses: unknown }).keyStatuses = new Map();
      return session;
    });
    const { state, context, reactor } = setup();
    const video = context.mediaElement.get()!;

    goWireless(video, true);
    stubWebKitMediaKeys(video);
    receiverRequest(video);

    await vi.waitFor(() =>
      expect(state.errors.get()?.map((error) => error.code)).toContain(SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED)
    );

    reactor.destroy();
  });

  it('closes the legacy session and releases the element on state exit', async () => {
    const { webkit, state, reactor, video } = await refuseEme();

    await vi.waitFor(() => expect(webkit.sessions).toHaveLength(1));

    state.loadingSuspended.set(false);

    await vi.waitFor(() => expect(webkit.sessions[0]!.close).toHaveBeenCalled());
    expect(
      (video as unknown as { webkitSetMediaKeys: ReturnType<typeof vi.fn> }).webkitSetMediaKeys
    ).toHaveBeenCalledWith(null);

    reactor.destroy();
  });
});
