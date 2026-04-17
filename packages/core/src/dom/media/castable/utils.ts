export const privateProps = new WeakMap<object, Record<string, any>>();

export class InvalidStateError extends Error {}
export class NotSupportedError extends Error {}
export class NotFoundError extends Error {}

const HLS_RESPONSE_HEADERS = ['application/x-mpegURL', 'application/vnd.apple.mpegurl', 'audio/mpegurl'];

export const IterableWeakSet: { new <T extends WeakKey>(): Set<T> } = globalThis.WeakRef
  ? (class<T extends WeakKey> extends Set<WeakRef<T>> {
      add(el: WeakRef<T>): this {
        super.add(new WeakRef(el as unknown as T) as unknown as WeakRef<T>);
        return this;
      }
      forEach(fn: (value: WeakRef<T>, value2: WeakRef<T>, set: Set<WeakRef<T>>) => void): void {
        super.forEach((ref) => {
          const value = ref.deref();
          if (value) fn(value as unknown as WeakRef<T>, value as unknown as WeakRef<T>, this);
        });
      }
    } as unknown as { new <T extends WeakKey>(): Set<T> })
  : (Set as unknown as { new <T extends WeakKey>(): Set<T> });

export function onCastApiAvailable(callback: () => void): void {
  if (!globalThis.chrome?.cast?.isAvailable) {
    (globalThis as Record<string, unknown>).__onGCastApiAvailable = () => {
      customElements.whenDefined('google-cast-button').then(callback);
    };
  } else if (!(globalThis as Record<string, unknown> & { cast?: typeof cast }).cast?.framework) {
    customElements.whenDefined('google-cast-button').then(callback);
  } else {
    callback();
  }
}

export function requiresCastFramework(): boolean {
  // todo: exclude for Android>=56 which supports the Remote Playback API natively.
  return Boolean(globalThis.chrome);
}

export function loadCastFramework(): void {
  const sdkUrl = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
  if (globalThis.chrome?.cast || document.querySelector(`script[src="${sdkUrl}"]`)) return;

  const script = document.createElement('script');
  script.src = sdkUrl;
  document.head.append(script);
}

export function castContext(): cast.framework.CastContext | undefined {
  return (globalThis as Record<string, unknown> & { cast?: typeof cast }).cast?.framework?.CastContext.getInstance();
}

export function currentSession(): cast.framework.CastSession | null | undefined {
  return castContext()?.getCurrentSession();
}

export function currentMedia(): chrome.cast.media.Media | undefined {
  return currentSession()?.getSessionObj().media[0] ?? undefined;
}

export function editTracksInfo(request: chrome.cast.media.EditTracksInfoRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    currentMedia()!.editTracksInfo(request, resolve, reject);
  });
}

export function getMediaStatus(request: chrome.cast.media.GetStatusRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    currentMedia()!.getStatus(request, resolve, reject);
  });
}

const MEDIA_NAMESPACE = 'urn:x-cast:com.google.cast.media';
let requestId = 0;

export function setPlaybackRate(rate: number): Promise<chrome.cast.ErrorCode | undefined> {
  const media = currentMedia();
  return currentSession()!.sendMessage(MEDIA_NAMESPACE, {
    type: 'SET_PLAYBACK_RATE',
    playbackRate: rate,
    mediaSessionId: media?.mediaSessionId,
    requestId: ++requestId,
  });
}

export type CastOptions = cast.framework.CastOptions;

export function setCastOptions(options: Partial<CastOptions>): void {
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

function getFormat(segment: string | undefined): string | null | undefined {
  if (!segment) return undefined;

  const regex = /\.([a-zA-Z0-9]+)(?:\?.*)?$/;
  const match = segment.match(regex);
  return match ? match[1] : null;
}

function parsePlaylistUrls(playlistContent: string): string[] {
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

function parseSegment(playlistContent: string): string | undefined {
  const lines = playlistContent.split('\n');
  return lines.find((line) => !line.trim().startsWith('#') && line.trim() !== '');
}

export async function isHls(url: string): Promise<boolean> {
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

export async function getPlaylistSegmentFormat(url: string): Promise<string | null | undefined> {
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
