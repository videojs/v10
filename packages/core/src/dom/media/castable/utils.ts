export class InvalidStateError extends Error {}
export class NotSupportedError extends Error {}
export class NotFoundError extends Error {}

const HLS_RESPONSE_HEADERS = ['application/x-mpegURL', 'application/vnd.apple.mpegurl', 'audio/mpegurl'];

export class IterableWeakSet<T extends WeakKey> {
  readonly #refs = new Set<WeakRef<T>>();
  readonly #seen = new WeakMap<T, WeakRef<T>>();

  add(value: T): this {
    if (this.#seen.has(value)) return this;
    const ref = new WeakRef(value);
    this.#seen.set(value, ref);
    this.#refs.add(ref);
    return this;
  }

  delete(value: T): boolean {
    const ref = this.#seen.get(value);
    if (!ref) return false;
    this.#seen.delete(value);
    return this.#refs.delete(ref);
  }

  forEach(fn: (value: T) => void): void {
    for (const ref of this.#refs) {
      const value = ref.deref();
      if (value) fn(value);
      else this.#refs.delete(ref);
    }
  }
}

export function onCastApiAvailable(callback: () => void) {
  const whenDefined = () => customElements.whenDefined('google-cast-button').then(callback);

  if (!globalThis.chrome?.cast?.isAvailable) {
    (globalThis as { __onGCastApiAvailable?: () => void }).__onGCastApiAvailable = whenDefined;
  } else if (typeof cast === 'undefined' || !cast.framework) {
    whenDefined();
  } else {
    callback();
  }
}

export function requiresCastFramework() {
  // todo: exclude for Android>=56 which supports the Remote Playback API natively.
  return Boolean(globalThis.chrome);
}

export function loadCastFramework() {
  const sdkUrl = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
  if (globalThis.chrome?.cast || document.querySelector(`script[src="${sdkUrl}"]`)) return;

  const script = document.createElement('script');
  script.src = sdkUrl;
  document.head.append(script);
}

export function castContext() {
  return typeof cast === 'undefined' ? undefined : cast.framework?.CastContext.getInstance();
}

export function currentSession() {
  return castContext()?.getCurrentSession();
}

export function currentMedia() {
  return currentSession()?.getSessionObj().media[0] ?? undefined;
}

export function editTracksInfo(request: chrome.cast.media.EditTracksInfoRequest) {
  return new Promise<void>((resolve, reject) => {
    currentMedia()!.editTracksInfo(request, resolve, reject);
  });
}

export function getMediaStatus(request: chrome.cast.media.GetStatusRequest) {
  return new Promise<void>((resolve, reject) => {
    currentMedia()!.getStatus(request, resolve, reject);
  });
}

const MEDIA_NAMESPACE = 'urn:x-cast:com.google.cast.media';
let requestId = 0;

export function setPlaybackRate(rate: number) {
  const media = currentMedia();
  return currentSession()!.sendMessage(MEDIA_NAMESPACE, {
    type: 'SET_PLAYBACK_RATE',
    playbackRate: rate,
    mediaSessionId: media?.mediaSessionId,
    requestId: ++requestId,
  });
}

export type CastOptions = cast.framework.CastOptions;

export function setCastOptions(options: Partial<CastOptions>) {
  castContext()!.setOptions({
    ...getDefaultCastOptions(),
    ...options,
  });
}

export function getDefaultCastOptions(): CastOptions {
  return {
    receiverApplicationId: 'CC1AD845',
    autoJoinPolicy:
      globalThis.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED ?? ('origin_scoped' as chrome.cast.AutoJoinPolicy),
    androidReceiverCompatible: false,
    language: 'en-US',
    resumeSavedSession: true,
  };
}

function getFormat(segment: string | undefined) {
  if (!segment) return undefined;

  const regex = /\.([a-zA-Z0-9]+)(?:\?.*)?$/;
  const match = segment.match(regex);
  return match ? match[1] : null;
}

function parsePlaylistUrls(playlistContent: string) {
  const lines = playlistContent.split('\n');
  const urls: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    if (line.startsWith('#EXT-X-STREAM-INF')) {
      const nextLine = lines[i + 1] ? lines[i + 1]!.trim() : '';
      if (nextLine && !nextLine.startsWith('#')) {
        urls.push(nextLine);
      }
    }
  }

  return urls;
}

function parseSegment(playlistContent: string) {
  const lines = playlistContent.split('\n');
  return lines.find((line) => !line.trim().startsWith('#') && line.trim() !== '');
}

export async function isHls(url: string) {
  if (!url) return false;
  if (/\.m3u8?(\?.*)?$/i.test(url)) return true;
  if (url.startsWith('blob:')) return false;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('Content-Type');
    if (!contentType) return false;
    const normalizedContentType = contentType.toLowerCase().split(';')[0]!.trim();
    return HLS_RESPONSE_HEADERS.some((header) => normalizedContentType === header.toLowerCase());
  } catch (err) {
    console.error('Error while trying to get the Content-Type of the manifest', err);
    return false;
  }
}

export async function getPlaylistSegmentFormat(url: string) {
  try {
    const mainManifestContent = await (await fetch(url)).text();
    let availableChunksContent = mainManifestContent;

    const playlists = parsePlaylistUrls(mainManifestContent);
    if (playlists.length > 0) {
      const chosenPlaylistUrl = new URL(playlists[0]!, url).toString();
      availableChunksContent = await (await fetch(chosenPlaylistUrl)).text();
    }

    const segment = parseSegment(availableChunksContent);
    const format = getFormat(segment);
    return format;
  } catch (err) {
    console.error('Error while trying to parse the manifest playlist', err);
    return undefined;
  }
}
