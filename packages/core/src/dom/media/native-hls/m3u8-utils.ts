// Utilities for parsing HLS m3u8 playlists.
//
// Native HLS playback does not expose manifest-level information like
// `HOLD-BACK` / `PART-HOLD-BACK` through a JS API, so consumers that need it
// (e.g. the live-edge mixin) fetch the playlist themselves and parse the
// relevant tags here.
//
// Mirrors the approach in `muxinc/elements/playback-core`. See:
// - https://github.com/muxinc/elements/blob/main/packages/playback-core/src/index.ts
// - https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-12

export interface StreamInfo {
  /**
   * Offset representing the seekable range size for live content.
   * `0` for standard latency live, `Infinity` for DVR, `NaN` for on-demand.
   */
  targetLiveWindow: number;
  /**
   * Offset (seconds) from `seekable.end` at which the live edge window begins.
   * `undefined` when the stream is not live.
   */
  liveEdgeStartOffset: number | undefined;
}

/**
 * Returns `true` when `src` looks like an HLS playlist URL. Permissive: a
 * path or query string containing `.m3u8` is enough.
 */
export function looksLikeM3u8(src: string) {
  return src.toLowerCase().includes('.m3u8');
}

/**
 * Returns `true` when the playlist text is a multivariant (master) playlist.
 *
 * The presence of `#EXT-X-STREAM-INF` is conclusive — media playlists only
 * contain `#EXTINF` segment tags.
 */
export function isMultivariantPlaylist(playlist: string) {
  return playlist.includes('#EXT-X-STREAM-INF');
}

/**
 * Resolves the first media playlist URL referenced by a multivariant
 * playlist, relative to `baseUrl`. Returns `null` when none is found or the
 * URL cannot be parsed.
 */
export function resolveFirstMediaPlaylistUrl(multivariant: string, baseUrl: string): string | null {
  const lines = multivariant.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('#EXT-X-STREAM-INF'));
  if (start === -1) return null;

  // The URI appears on the first non-blank, non-comment line that follows.
  const uri = lines
    .slice(start + 1)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  if (!uri) return null;

  try {
    return new URL(uri, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Parses the subset of media-playlist tags needed to derive live edge state:
 * `#EXT-X-PLAYLIST-TYPE`, `#EXT-X-ENDLIST`, `#EXT-X-TARGETDURATION`,
 * `#EXT-X-PART-INF`.
 *
 * See spec:
 * - VOD or `#EXT-X-ENDLIST` present → on-demand, `targetLiveWindow = NaN`.
 * - `EVENT` playlist → DVR, `targetLiveWindow = Infinity`.
 * - Otherwise → standard live sliding window, `targetLiveWindow = 0`.
 *
 * The edge offset is `PART-TARGET * 2` for low-latency live and
 * `TARGETDURATION * 3` otherwise.
 */
export function parseStreamInfo(playlist: string): StreamInfo {
  const lines = playlist.split(/\r?\n/);

  let playlistType: string | undefined;
  let hasEndList = false;
  let targetDuration: number | undefined;
  let partTarget: number | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('#EXT-X-PLAYLIST-TYPE:')) {
      playlistType = line.slice('#EXT-X-PLAYLIST-TYPE:'.length).trim().toUpperCase();
    } else if (line === '#EXT-X-ENDLIST') {
      hasEndList = true;
    } else if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      const value = Number(line.slice('#EXT-X-TARGETDURATION:'.length));
      if (Number.isFinite(value)) targetDuration = value;
    } else if (line.startsWith('#EXT-X-PART-INF')) {
      const match = /PART-TARGET\s*=\s*([0-9.]+)/i.exec(line);
      if (match) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) partTarget = value;
      }
    }
  }

  if (playlistType === 'VOD' || hasEndList) {
    return { targetLiveWindow: Number.NaN, liveEdgeStartOffset: undefined };
  }

  const targetLiveWindow = playlistType === 'EVENT' ? Number.POSITIVE_INFINITY : 0;

  const liveEdgeStartOffset =
    partTarget !== undefined ? partTarget * 2 : targetDuration !== undefined ? targetDuration * 3 : undefined;

  return { targetLiveWindow, liveEdgeStartOffset };
}

async function fetchPlaylist(url: string, init: RequestInit): Promise<{ text: string; url: string }> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Failed to fetch playlist (${response.status}): ${url}`);
  return { text: await response.text(), url: response.url || url };
}

/**
 * Fetches the HLS playlist at `src`, following the first variant if it's a
 * multivariant playlist, and parses it into a {@link StreamInfo}.
 *
 * @throws when the fetch fails or no media playlist URL can be resolved.
 */
export async function getStreamInfoFromSrc(src: string, signal?: AbortSignal): Promise<StreamInfo> {
  const init: RequestInit = signal ? { signal } : {};
  const { text, url } = await fetchPlaylist(src, init);

  if (!isMultivariantPlaylist(text)) return parseStreamInfo(text);

  const mediaUrl = resolveFirstMediaPlaylistUrl(text, url);
  if (!mediaUrl) throw new Error('No media playlist URL found in multivariant playlist');
  const media = await fetchPlaylist(mediaUrl, init);
  return parseStreamInfo(media.text);
}
