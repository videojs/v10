import { getChromeVersion, isAndroid, loadScript } from '@videojs/utils/dom';

export const GOOGLE_CAST_FRAMEWORK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

export function onCastApiAvailable(callback: () => void) {
  const whenDefined = () => {
    if (typeof customElements === 'undefined') {
      callback();
      return;
    }

    customElements.whenDefined('google-cast-launcher').then(callback);
  };

  if (!globalThis.chrome?.cast?.isAvailable) {
    (globalThis as { __onGCastApiAvailable?: () => void }).__onGCastApiAvailable = whenDefined;
  } else if (typeof cast === 'undefined' || !cast.framework) {
    whenDefined();
  } else {
    callback();
  }
}

export function requiresCastFramework() {
  const chromeVersion = getChromeVersion();

  // Android>=56 supports the Remote Playback API natively
  const isAtLeastAndroid56 = isAndroid() && chromeVersion !== null && chromeVersion >= 56;

  return Boolean(globalThis.chrome) && !isAtLeastAndroid56;
}

export async function loadCastFramework() {
  if (globalThis.chrome?.cast) return;
  await loadScript(GOOGLE_CAST_FRAMEWORK_URL);
}

export function getCastContext() {
  return typeof cast === 'undefined' ? undefined : cast.framework?.CastContext.getInstance();
}

export function currentSession() {
  return getCastContext()?.getCurrentSession();
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

export function setCastPlaybackRate(rate: number) {
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
  getCastContext()!.setOptions({
    ...getDefaultCastOptions(),
    ...options,
  });
}

export function getDefaultCastOptions(): CastOptions {
  return {
    receiverApplicationId: 'CC1AD845',
    autoJoinPolicy: globalThis.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED ?? 'origin_scoped',
    androidReceiverCompatible: false,
    language: 'en-US',
    resumeSavedSession: true,
  };
}

export async function getCastPlaylistSegmentFormat(url: string) {
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
