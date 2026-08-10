import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrmSystemsConfig } from '../../../core/drm';
import { MediaError } from '../../../core/media-error';
import { NativeHlsDrmErrors } from '../fairplay';
import { NativeHlsMedia } from '../index';

const LICENSE_URL = 'https://license.test/fairplay';
const CERTIFICATE_URL = 'https://license.test/appcert';

/** A CKC the license server hands back. */
const CKC = new Uint8Array([1, 2, 3, 4]);
/** The DER application certificate. */
const CERTIFICATE = new Uint8Array([9, 8, 7, 6]);

/** The `skd://` URI WebKit reports, encoded the way it arrives: UTF-16LE. */
function skdInitData(contentId: string): ArrayBuffer {
  const uri = `skd://${contentId}`;
  const bytes = new Uint8Array(uri.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < uri.length; i++) view.setUint16(i * 2, uri.charCodeAt(i), true);
  return bytes.buffer;
}

/** jsdom implements neither `MediaEncryptedEvent` nor `webkitneedkey`. */
function fireKeyRequest(
  video: HTMLVideoElement,
  type: 'encrypted' | 'webkitneedkey' = 'encrypted',
  initData?: unknown
) {
  video.dispatchEvent(
    Object.assign(new Event(type), {
      initDataType: 'skd',
      initData: initData === undefined ? skdInitData('abc123') : initData,
    })
  );
}

interface KeySystemStubs {
  session: {
    generateRequest: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    keyStatuses: Map<string, MediaKeyStatus>;
    dispatch(event: Event): void;
  };
  mediaKeys: { createSession: ReturnType<typeof vi.fn>; setServerCertificate: ReturnType<typeof vi.fn> };
  requestMediaKeySystemAccess: ReturnType<typeof vi.fn>;
}

/** A CDM that grants access, accepts the certificate, and opens sessions. */
function stubKeySystem(): KeySystemStubs {
  const listeners = new Map<string, Set<EventListener>>();

  const session = {
    generateRequest: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    keyStatuses: new Map<string, MediaKeyStatus>(),
    addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
      options?.signal?.addEventListener('abort', () => listeners.get(type)!.delete(listener));
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(event: Event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
    },
  };

  const mediaKeys = {
    createSession: vi.fn(() => session),
    setServerCertificate: vi.fn(async () => true),
  };

  const requestMediaKeySystemAccess = vi.fn(async () => ({ createMediaKeys: async () => mediaKeys }));

  Object.defineProperty(navigator, 'requestMediaKeySystemAccess', {
    value: requestMediaKeySystemAccess,
    configurable: true,
    writable: true,
  });

  return { session, mediaKeys, requestMediaKeySystemAccess } as unknown as KeySystemStubs;
}

/** The pre-EME WebKit key API, which jsdom has no notion of. */
function stubWebKitKeySystem() {
  const listeners = new Map<string, Set<EventListener>>();

  const session = {
    error: null as { code: number; systemCode: number } | null,
    update: vi.fn(),
    close: vi.fn(),
    addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
      options?.signal?.addEventListener('abort', () => listeners.get(type)!.delete(listener));
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(event: Event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
    },
  };

  const createSession = vi.fn((_mimeType: string, _initData: BufferSource) => session);
  const setMediaKeys = vi.fn((_keys: unknown) => {});

  vi.stubGlobal(
    'WebKitMediaKeys',
    class {
      createSession = createSession;
    }
  );

  return {
    session,
    createSession,
    setMediaKeys,
    install(video: HTMLVideoElement) {
      let current: unknown = null;
      setMediaKeys.mockImplementation((value) => {
        current = value;
      });
      Object.defineProperty(video, 'webkitKeys', { get: () => current, configurable: true });
      Object.defineProperty(video, 'webkitSetMediaKeys', { value: setMediaKeys, configurable: true });
    },
  };
}

/** Certificate and license responses, both keyed off the request URL. */
function stubFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url === CERTIFICATE_URL ? CERTIFICATE : CKC;
    return { ok: true, arrayBuffer: async () => body.buffer.slice(0) } as Response;
  });
}

/**
 * Licensed the standard way, through `source.drm`. Systems only an MSE engine
 * can negotiate are welcome there — one source describes every path — so the
 * helper takes whatever a caller would name.
 */
function setup(
  drm: DrmSystemsConfig | null = { 'com.apple.fps': { licenseUrl: LICENSE_URL, serverCertificateUrl: CERTIFICATE_URL } }
) {
  const video = document.createElement('video');
  document.body.append(video);

  const media = new NativeHlsMedia();
  media.attach(video);
  media.source = {
    src: 'https://example.test/protected.m3u8',
    ...(drm && { drm }),
  };

  const errors = vi.fn();
  media.addEventListener('error', errors);

  return { media, video, errors };
}

/**
 * Let the setup chain (key access → certificate → session → license) settle.
 * Yielding to the macrotask queue drains every microtask in between.
 */
async function settle() {
  for (let i = 0; i < 3; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NativeHlsMediaDrmMixin', () => {
  it('carries the DRM configuration across an `src` assignment', () => {
    const { media } = setup();

    media.src = 'https://example.test/other.m3u8';

    expect(media.source).toEqual({
      drm: { 'com.apple.fps': { licenseUrl: LICENSE_URL, serverCertificateUrl: CERTIFICATE_URL } },
      src: 'https://example.test/other.m3u8',
    });
  });

  it('licenses from `engine.nativeHls.drmSystems` where the native path names its own', async () => {
    const nativeLicense = 'https://license.test/native-fairplay';
    const { session } = stubKeySystem();
    const video = document.createElement('video');
    document.body.append(video);

    const media = new NativeHlsMedia();
    media.attach(video);
    video.setMediaKeys = vi.fn(async () => {});
    media.source = {
      src: 'https://example.test/protected.m3u8',
      drm: { 'com.apple.fps': { licenseUrl: LICENSE_URL, serverCertificateUrl: CERTIFICATE_URL } },
      engine: { nativeHls: { drmSystems: { 'com.apple.fps': { licenseUrl: nativeLicense } } } },
    };

    fireKeyRequest(video);
    await settle();

    session.dispatch(Object.assign(new Event('message'), { message: new Uint8Array([5, 5]).buffer }));
    await settle();

    // The escape hatch replaces `source.drm` rather than merging with it, so no
    // certificate is fetched either.
    expect(fetchMock).not.toHaveBeenCalledWith(CERTIFICATE_URL, expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(nativeLicense, expect.objectContaining({ method: 'POST' }));
  });

  it('exchanges the SPC for a license and updates the session', async () => {
    const { session } = stubKeySystem();
    const setMediaKeys = vi.fn(async () => {});
    const { video } = setup();
    video.setMediaKeys = setMediaKeys;

    fireKeyRequest(video);
    await settle();

    expect(fetchMock).toHaveBeenCalledWith(CERTIFICATE_URL, expect.anything());
    expect(setMediaKeys).toHaveBeenCalled();
    expect(session.generateRequest).toHaveBeenCalledWith('skd', expect.any(ArrayBuffer));

    session.dispatch(Object.assign(new Event('message'), { message: new Uint8Array([5, 5]).buffer }));
    await settle();

    expect(fetchMock).toHaveBeenCalledWith(
      LICENSE_URL,
      expect.objectContaining({ method: 'POST', body: expect.anything() })
    );
    expect(session.update).toHaveBeenCalledWith(CKC);
  });

  it('follows a license server updated on the playing source', async () => {
    const rotated = 'https://license.test/fairplay?token=rotated';
    const { session } = stubKeySystem();
    const { media, video } = setup();
    video.setMediaKeys = vi.fn(async () => {});

    fireKeyRequest(video);
    await settle();

    // Same manifest, new license server: nothing reloads, so the key system the
    // CDM is holding has to pick the change up on its own.
    media.source = { src: media.src, drm: { 'com.apple.fps': { licenseUrl: rotated } } };

    session.dispatch(Object.assign(new Event('message'), { message: new Uint8Array([5, 5]).buffer }));
    await settle();

    expect(fetchMock).toHaveBeenCalledWith(rotated, expect.objectContaining({ method: 'POST' }));
    expect(session.update).toHaveBeenCalledWith(CKC);
  });

  it('negotiates FairPlay against the manifest, without persistent state', async () => {
    const { requestMediaKeySystemAccess } = stubKeySystem();
    const { video } = setup();
    video.setMediaKeys = vi.fn(async () => {});

    fireKeyRequest(video);
    await settle();

    expect(requestMediaKeySystemAccess).toHaveBeenCalledWith('com.apple.fps', [
      expect.objectContaining({
        initDataTypes: ['skd'],
        persistentState: 'not-allowed',
        distinctiveIdentifier: 'not-allowed',
      }),
    ]);
  });

  it('fails loudly when protected content has no DRM configuration', () => {
    stubKeySystem();
    const { media, video, errors } = setup(null);

    fireKeyRequest(video);

    expect(errors).toHaveBeenCalledOnce();
    expect(media.error).toBeInstanceOf(MediaError);
    expect(media.error!.code).toBe(MediaError.MEDIA_ERR_ENCRYPTED);
    expect(media.error!.context).toBe(NativeHlsDrmErrors.MISSING_CONFIGURATION);
  });

  it('fails when only key systems native playback cannot negotiate are configured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubKeySystem();
    const { media, video } = setup({ 'com.widevine.alpha': { licenseUrl: 'https://license.test/widevine' } });

    fireKeyRequest(video);

    expect(media.error!.context).toBe(NativeHlsDrmErrors.MISSING_CONFIGURATION);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('com.apple.fps'));
  });

  it('ignores initialization data it cannot act on', async () => {
    const { requestMediaKeySystemAccess } = stubKeySystem();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { video, errors } = setup();

    video.dispatchEvent(Object.assign(new Event('encrypted'), { initDataType: 'cenc', initData: new ArrayBuffer(8) }));
    await settle();

    expect(requestMediaKeySystemAccess).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it('reports a rejected key system as a fatal encrypted error', async () => {
    const { requestMediaKeySystemAccess } = stubKeySystem();
    requestMediaKeySystemAccess.mockRejectedValue(new Error('unsupported'));

    const { media, video } = setup();

    fireKeyRequest(video);
    await settle();

    expect(media.error!.context).toBe(NativeHlsDrmErrors.UNSUPPORTED_KEY_SYSTEM);
    expect(media.error!.fatal).toBe(true);
  });

  it('reports a rejected application certificate', async () => {
    const { mediaKeys } = stubKeySystem();
    mediaKeys.setServerCertificate.mockResolvedValue(false);

    const { media, video } = setup();
    video.setMediaKeys = vi.fn(async () => {});

    fireKeyRequest(video);
    await settle();

    expect(media.error!.context).toBe(NativeHlsDrmErrors.SERVER_CERTIFICATE_FAILED);
  });

  it('reports a license server that answers with an error', async () => {
    const { session } = stubKeySystem();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
      String(input) === CERTIFICATE_URL
        ? ({ ok: true, arrayBuffer: async () => CERTIFICATE.buffer.slice(0) } as Response)
        : ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) } as Response)
    );

    const { media, video } = setup();
    video.setMediaKeys = vi.fn(async () => {});

    fireKeyRequest(video);
    await settle();

    session.dispatch(Object.assign(new Event('message'), { message: new ArrayBuffer(2) }));
    await settle();

    expect(media.error!.context).toBe(NativeHlsDrmErrors.LICENSE_REQUEST_FAILED);
    expect(session.update).not.toHaveBeenCalled();
  });

  it('announces an insecure output without latching it as the error', async () => {
    const { session } = stubKeySystem();
    const { media, video, errors } = setup();
    video.setMediaKeys = vi.fn(async () => {});

    fireKeyRequest(video);
    await settle();

    session.keyStatuses.set('key', 'output-restricted');
    session.dispatch(new Event('keystatuseschange'));

    const event = errors.mock.calls[0]![0] as ErrorEvent;
    expect(event.error.context).toBe(NativeHlsDrmErrors.OUTPUT_RESTRICTED);
    expect(event.error.fatal).toBe(false);
    // Playback continues, so it must not stand in for whatever fails next.
    expect(media.error).toBeNull();
  });

  it('closes sessions and releases keys on `emptied`', async () => {
    const { session } = stubKeySystem();
    const setMediaKeys = vi.fn(async (_keys: MediaKeys | null) => {});
    const { video } = setup();
    video.setMediaKeys = setMediaKeys;

    fireKeyRequest(video);
    await settle();

    Object.defineProperty(video, 'mediaKeys', { value: setMediaKeys.mock.calls[0]![0], configurable: true });
    video.dispatchEvent(new Event('emptied'));
    await settle();

    expect(session.close).toHaveBeenCalled();
    expect(setMediaKeys).toHaveBeenLastCalledWith(null);
  });

  it('installs no keys when the source is replaced mid key exchange', async () => {
    const { mediaKeys, requestMediaKeySystemAccess } = stubKeySystem();

    // Hold the CDM negotiation open so teardown lands in the middle of it.
    let grantAccess: (() => void) | undefined;
    const granted = new Promise<void>((resolve) => {
      grantAccess = resolve;
    });
    requestMediaKeySystemAccess.mockImplementation(async () => {
      await granted;
      return { createMediaKeys: async () => mediaKeys };
    });

    const setMediaKeys = vi.fn(async (_keys: MediaKeys | null) => {});
    const { video } = setup();
    video.setMediaKeys = setMediaKeys;

    fireKeyRequest(video);
    await settle();

    // A new resource abandons this exchange, then the CDM answers anyway. The
    // element is shared with whatever plays next, so nothing may be installed on
    // it this late.
    video.dispatchEvent(new Event('emptied'));
    grantAccess?.();
    await settle();

    expect(setMediaKeys).not.toHaveBeenCalled();
  });

  it('stops answering key requests after detach', async () => {
    const { requestMediaKeySystemAccess } = stubKeySystem();
    const { media, video } = setup();

    media.detach();
    fireKeyRequest(video);
    await settle();

    expect(requestMediaKeySystemAccess).not.toHaveBeenCalled();
  });

  it('leaves `webkitneedkey` alone while EME is in charge', async () => {
    const { requestMediaKeySystemAccess } = stubKeySystem();
    const { video, errors } = setup();

    fireKeyRequest(video, 'webkitneedkey');
    await settle();

    expect(requestMediaKeySystemAccess).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  describe('legacy WebKit fallback', () => {
    /**
     * Drive the one handover the legacy path exists for: EME cannot generate a
     * request while the playback target is an AirPlay receiver.
     */
    async function setupFallback() {
      const eme = stubKeySystem();
      eme.session.generateRequest.mockRejectedValue(new DOMException('nope', 'NotSupportedError'));

      const webkit = stubWebKitKeySystem();
      const { media, video, errors } = setup();
      video.setMediaKeys = vi.fn(async () => {});
      video.load = vi.fn();
      webkit.install(video);
      Object.defineProperty(video, 'webkitCurrentPlaybackTargetIsWireless', { value: true, configurable: true });

      fireKeyRequest(video);
      await settle();

      return { media, video, errors, eme, webkit };
    }

    it('hands over to the legacy API and reloads to have the key request re-issued', async () => {
      const { video, errors } = await setupFallback();

      expect(video.load).toHaveBeenCalled();
      // The handover is not a failure, so nothing is surfaced.
      expect(errors).not.toHaveBeenCalled();
    });

    it('serves `webkitneedkey` once it has taken over', async () => {
      const { video, webkit } = await setupFallback();

      fireKeyRequest(video, 'webkitneedkey');
      await settle();

      expect(webkit.setMediaKeys).toHaveBeenCalledWith(expect.any(Object));
      expect(webkit.createSession).toHaveBeenCalledWith('application/vnd.apple.mpegurl', expect.any(Uint8Array));

      webkit.session.dispatch(Object.assign(new Event('webkitkeymessage'), { message: new ArrayBuffer(2) }));
      await settle();

      expect(webkit.session.update).toHaveBeenCalledWith(CKC);
    });

    it('packs the content id and certificate into the session initialization data', async () => {
      const { video, webkit } = await setupFallback();

      fireKeyRequest(video, 'webkitneedkey');
      await settle();

      const packed = webkit.createSession.mock.calls[0]![1] as Uint8Array;
      const initData = skdInitData('abc123');
      const view = new DataView(packed.buffer);

      expect(packed.slice(0, initData.byteLength)).toEqual(new Uint8Array(initData));

      let offset = initData.byteLength;
      const contentIdLength = view.getUint32(offset, true);
      offset += 4;
      expect(new TextDecoder('utf-16le').decode(packed.slice(offset, offset + contentIdLength))).toBe('abc123');

      offset += contentIdLength;
      const certificateLength = view.getUint32(offset, true);
      offset += 4;
      expect(certificateLength).toBe(CERTIFICATE.byteLength);
      expect(packed.slice(offset, offset + certificateLength)).toEqual(CERTIFICATE);
    });

    it('reports a CDM failure reported through `webkitkeyerror`', async () => {
      const { media, video, webkit } = await setupFallback();

      fireKeyRequest(video, 'webkitneedkey');
      await settle();

      webkit.session.error = { code: 1, systemCode: 42 };
      webkit.session.dispatch(new Event('webkitkeyerror'));

      expect(media.error!.context).toBe(NativeHlsDrmErrors.CDM_ERROR);
      expect(media.error!.data).toEqual({ code: 1, systemCode: 42 });
    });
  });
});
