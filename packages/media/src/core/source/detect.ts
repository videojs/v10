import { parseCloudflareSource } from './cloudflare';
import { parseSpotifySource } from './spotify';
import { parseTikTokSource } from './tiktok';
import { parseTwitchSource } from './twitch';
import { parseVimeoSource } from './vimeo';
import { parseWistiaMediaId } from './wistia';
import { parseYouTubeSource } from './youtube';

/** A kind of source {@link detectMediaSource} recognizes. Each kind is played by a different media component. */
export type MediaSourceKind =
  | 'youtube'
  | 'vimeo'
  | 'wistia'
  | 'mux'
  | 'cloudflare'
  | 'spotify'
  | 'tiktok'
  | 'twitch'
  | 'hls'
  | 'dash'
  | 'video'
  | 'audio';

/** What {@link detectMediaSource} found out about a source. */
export interface DetectedMediaSource {
  /** Which kind of media plays the source. */
  kind: MediaSourceKind;
  /**
   * The source to give that media. Vidstack's `youtube/<id>` and `vimeo/<id>` shorthands expand to a URL the media
   * accepts; every other source comes back as given.
   */
  src: string;
  /** The provider's id for the source (a video, playback, or entity id, or a channel name), when the kind has one. */
  id?: string;
  /** MIME type of a stream or file, when the source names or implies one. */
  type?: string;
}

/**
 * Detect which kind of media plays a source URL, so you can render the matching media component. Recognizes YouTube,
 * Vimeo, Wistia, Mux, Cloudflare Stream, Spotify, TikTok, and Twitch URLs; HLS and DASH manifests; and video and audio
 * files, by MIME type when you pass one and by file extension otherwise.
 *
 * Returns `null` for anything else, including bare ids: an 11-character YouTube id and a 10-character Wistia id look
 * alike, so providers are only matched on URLs, `spotify:` URIs, and Vidstack's `youtube/<id>` and `vimeo/<id>`
 * shorthands.
 *
 * Detection names a kind of source, not a playback engine. Choosing between the HLS engines is up to you.
 *
 * @param src - The source URL, or a Vidstack-style shorthand.
 * @param type - The source's MIME type, when known. It takes precedence over the file extension, so manifests and files
 *   without one can still be detected.
 * @public
 */
export function detectMediaSource(src: string, type?: string): DetectedMediaSource | null {
  const source = src.trim();
  if (!source) return null;

  return detectShorthand(source) ?? detectProvider(source) ?? detectByType(source, type) ?? detectByExtension(source);
}

function detectShorthand(src: string): DetectedMediaSource | null {
  const youtubeId = YOUTUBE_SHORTHAND.exec(src)?.[1];
  // Vidstack played these shorthands from YouTube's privacy-enhanced host, so they keep doing so.
  if (youtubeId) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${youtubeId}`, id: youtubeId };

  const [, vimeoId, hash] = VIMEO_SHORTHAND.exec(src) ?? [];
  if (!vimeoId) return null;

  return { kind: 'vimeo', src: `https://vimeo.com/${vimeoId}${hash ? `?h=${hash}` : ''}`, id: vimeoId };
}

function detectProvider(src: string): DetectedMediaSource | null {
  if (SPOTIFY_URI.test(src)) return fromId('spotify', src, parseSpotifySource(src)?.id);

  const url = parseUrl(src);
  if (!url) return null;

  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    const parsed = parseYouTubeSource(src);

    return fromId('youtube', src, parsed?.id ?? parsed?.listId);
  }

  if (VIMEO_HOSTS.has(host)) return fromId('vimeo', src, parseVimeoSource(src)?.id?.toString());

  if (
    isHost(host, 'wistia.com') ||
    isHost(host, 'wistia.net') ||
    isHost(host, 'wi.st') ||
    url.searchParams.has('wvideo')
  ) {
    return fromId('wistia', src, parseWistiaMediaId(src));
  }

  if (host === 'stream.mux.com') return fromId('mux', src, MUX_STREAM_PATH.exec(url.pathname)?.[1]);

  if (host === 'player.mux.com') {
    const playbackId = MUX_PLAYER_PATH.exec(url.pathname)?.[1];

    // Mux media plays stream URLs, not player page URLs.
    return playbackId ? { kind: 'mux', src: `https://stream.mux.com/${playbackId}.m3u8`, id: playbackId } : null;
  }

  if (isHost(host, 'cloudflarestream.com') || isHost(host, 'videodelivery.net')) {
    return fromId('cloudflare', src, parseCloudflareSource(src)?.id);
  }

  if (host === 'open.spotify.com') return fromId('spotify', src, parseSpotifySource(src)?.id);

  if (TIKTOK_HOSTS.has(host)) return fromId('tiktok', src, parseTikTokSource(src)?.id);

  if (TWITCH_HOSTS.has(host)) {
    const parsed = parseTwitchSource(src);

    return fromId('twitch', src, parsed?.id ?? parsed?.channel);
  }

  return null;
}

function detectByType(src: string, type: string | undefined): DetectedMediaSource | null {
  const mimeType = type?.trim().toLowerCase();
  if (!mimeType) return null;

  if (HLS_TYPES.has(mimeType)) return { kind: 'hls', src, type: mimeType };

  if (mimeType === DASH_TYPE) return { kind: 'dash', src, type: mimeType };

  if (mimeType.startsWith('video/')) return { kind: 'video', src, type: mimeType };

  if (mimeType.startsWith('audio/')) return { kind: 'audio', src, type: mimeType };

  return null;
}

function detectByExtension(src: string): DetectedMediaSource | null {
  const extension = EXTENSION.exec(src.split(/[?#]/, 1)[0]!)?.[1]?.toLowerCase();
  if (!extension) return null;

  const match = EXTENSIONS.get(extension);

  return match ? { kind: match.kind, src, type: match.type } : null;
}

function fromId(kind: MediaSourceKind, src: string, id: string | null | undefined): DetectedMediaSource | null {
  return id ? { kind, src, id } : null;
}

function isHost(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Parse an absolute URL, or a host-first one such as `youtu.be/<id>`. Paths and bare ids don't parse. */
function parseUrl(src: string): URL | null {
  if (URL_SCHEME.test(src)) return tryParseUrl(src);

  return HOST_FIRST.test(src) ? tryParseUrl(`https://${src}`) : null;
}

function tryParseUrl(src: string): URL | null {
  try {
    return new URL(src);
  } catch {
    return null;
  }
}

const YOUTUBE_SHORTHAND = /^youtube\/(?:shorts\/)?([\w-]{11})$/;
const VIMEO_SHORTHAND = /^vimeo\/(?:video\/)?(\d+)(?:(?:\?hash=|\?h=|\/)([\w-]+))?$/;
const SPOTIFY_URI = /^spotify:/i;
const URL_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
// A dotted host followed by a path, like `youtu.be/<id>`, as opposed to a relative path like `media/video.mp4`.
const HOST_FIRST = /^[\w-]+(?:\.[\w-]+)+\//;
const EXTENSION = /\.([a-z\d]+)$/i;
const MUX_STREAM_PATH = /^\/([^/]+)\.m3u8$/;
const MUX_PLAYER_PATH = /^\/([^/]+)\/?$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
// `vm.tiktok.com` short links carry an opaque code instead of the numeric video id.
const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com']);
// `clips.twitch.tv` is a different embed the Twitch media can't play.
const TWITCH_HOSTS = new Set(['twitch.tv', 'www.twitch.tv', 'go.twitch.tv']);

const HLS_TYPES: ReadonlySet<string> = new Set([
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'application/mpegurl',
  'audio/mpegurl',
  'audio/x-mpegurl',
]);
const DASH_TYPE = 'application/dash+xml';

const EXTENSIONS: ReadonlyMap<string, { kind: MediaSourceKind; type: string }> = new Map([
  ['m3u8', { kind: 'hls', type: 'application/x-mpegurl' }],
  ['mpd', { kind: 'dash', type: DASH_TYPE }],
  ['mp4', { kind: 'video', type: 'video/mp4' }],
  ['webm', { kind: 'video', type: 'video/webm' }],
  ['mov', { kind: 'video', type: 'video/quicktime' }],
  ['ogv', { kind: 'video', type: 'video/ogg' }],
  ['mp3', { kind: 'audio', type: 'audio/mpeg' }],
  ['m4a', { kind: 'audio', type: 'audio/mp4' }],
  ['wav', { kind: 'audio', type: 'audio/wav' }],
  ['ogg', { kind: 'audio', type: 'audio/ogg' }],
  ['flac', { kind: 'audio', type: 'audio/flac' }],
  ['aac', { kind: 'audio', type: 'audio/aac' }],
]);
