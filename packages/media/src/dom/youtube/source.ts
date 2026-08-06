import { serializeEmbedParams } from '../utils';
import { type YouTubeMediaProps, youtubeMediaDefaultProps } from './props';

/**
 * YouTube engine options, spelled exactly as YouTube spells them
 * (https://developers.google.com/youtube/player_parameters). They are serialized
 * onto the embed URL verbatim, so what you write here is what the player reads.
 *
 * Parameters the host owns are deliberately absent: `autoplay`, `controls`, and
 * `playsinline` come from the props of the same name, so configuring them here
 * would give two ways to say one thing. Parameters YouTube has deprecated
 * (`modestbranding`, `showinfo`, `autohide`, `theme`, and `listType: 'search'`)
 * are absent too. The index signature still carries anything not listed here, so
 * undocumented knobs and whatever YouTube adds next keep working.
 */
export interface YouTubeEngineConfig extends Record<string, unknown> {
  /** ISO 639-1 language to display captions in. Pair with `cc_load_policy`. */
  cc_lang_pref?: string;
  /** Show closed captions by default, even if the viewer has turned them off. */
  cc_load_policy?: 1;
  /** Progress-bar highlight color. Defaults to `'red'`. */
  color?: 'red' | 'white';
  /** Stop responding to keyboard controls. Defaults to `0`. */
  disablekb?: 0 | 1;
  /** Allow the player to be driven through the IFrame Player API. Defaults to `0`. */
  enablejsapi?: 0 | 1;
  /** Stop playback this many seconds from the start of the video. */
  end?: number;
  /** Display the fullscreen button. Defaults to `1`. */
  fs?: 0 | 1;
  /** Player interface language: an ISO 639-1 code or full locale (`fr`, `fr-ca`). */
  hl?: string;
  /** Show video annotations (`1`) or hide them (`3`). Defaults to `1`. */
  iv_load_policy?: 1 | 3;
  /** Playlist id (prefixed with `PL`) or channel name, depending on `listType`. */
  list?: string;
  /** What `list` refers to. */
  listType?: 'playlist' | 'user_uploads';
  /** Repeat playback. Looping a single video also needs `playlist` set to the same id. */
  loop?: 0 | 1;
  /** Embedding domain. Set it whenever `enablejsapi` is `1`. */
  origin?: string;
  /** Comma-separated video ids to play after the one named by the URL path. */
  playlist?: string;
  /** Draw related videos from the same channel (`0`) or anywhere (`1`). Defaults to `1`. */
  rel?: 0 | 1;
  /** Begin playback this many seconds from the start of the video. */
  start?: number;
  /** Embedding URL reported to YouTube Analytics for widget-hosted players. */
  widget_referrer?: string;
  /** `referrerpolicy` for the embed iframe. Not a YouTube player parameter. */
  referrerPolicy?: ReferrerPolicy;
}

/** Structured YouTube source: which source to play, plus how to play it. */
export interface YouTubeSource {
  /** YouTube URL or id. Mirrors the host's `src` property. */
  src?: string | undefined;
  /** YouTube's own player parameters, passed through untouched. */
  engine?: YouTubeEngineConfig | undefined;
}

/** Parsed pieces of a YouTube source URL. */
export interface ParsedYouTubeSource {
  /** 11-character video id (null for playlist-only sources). */
  id: string | null;
  /** `'video'` for single videos, `'playlist'` for playlist sources. */
  kind: 'video' | 'playlist';
  /** Playlist id (the `list` parameter). */
  listId: string | null;
  /** Start time in seconds parsed from the `t` parameter. */
  startTime: number | null;
  /** Whether the source uses the youtube-nocookie.com privacy-enhanced host. */
  noCookie: boolean;
}

/** Extract a YouTube video id from a raw 11-character id or any recognized URL. */
export function parseYouTubeVideoId(src: string) {
  return parseYouTubeSource(src)?.id ?? null;
}

/**
 * Parse a YouTube source string. Recognizes raw 11-character ids, `youtu.be`
 * short links, `watch?v=`, `embed/`, `v/`, `shorts/` and `live/` URLs (with or
 * without the `-nocookie` host), playlist URLs via the `list` parameter, and
 * start times via the `t` parameter.
 */
export function parseYouTubeSource(src: string): ParsedYouTubeSource | null {
  if (!src) return null;
  if (/^[\w-]{11}$/.test(src)) {
    return { id: src, kind: 'video', listId: null, startTime: null, noCookie: false };
  }
  const noCookie = src.includes('-nocookie');
  const videoMatch = VIDEO_MATCH_SRC.exec(src);
  const listMatch = PLAYLIST_MATCH_SRC.exec(src);
  // Playlist embed URLs use the `videoseries` placeholder in the video id slot.
  const videoId = videoMatch?.[1] ?? null;
  const id = videoId === 'videoseries' ? null : videoId;
  if (!id && !listMatch) return null;
  return {
    id,
    kind: id ? 'video' : 'playlist',
    listId: listMatch?.[1] ?? null,
    startTime: parseStartTime(src),
    noCookie,
  };
}

/** Build the iframe `src` URL for an initial YouTube embed from the given props. */
export function buildYouTubeIframeSrc(src: string, props: Partial<YouTubeMediaProps> = {}) {
  const parsed = parseYouTubeSource(src);
  if (!parsed) return '';
  const embedBase = parsed.noCookie ? EMBED_BASE_NOCOOKIE : EMBED_BASE;
  const params: Record<string, unknown> = {
    // Hide YouTube chrome by default; pass nothing only when controls is explicitly true.
    controls: props.controls === true ? null : 0,
    autoplay: props.autoplay,
    loop: props.loop,
    mute: props.defaultMuted,
    playsinline: props.playsInline ?? youtubeMediaDefaultProps.playsInline,
    preload: props.preload ?? youtubeMediaDefaultProps.preload,
    // https://developers.google.com/youtube/player_parameters#Parameters
    enablejsapi: 1,
    rel: 0,
    iv_load_policy: 3,
    start: parsed.startTime,
    // YouTube-specific knobs (`cc_load_policy`, `hl`, `color`, …) flow through here.
    ...(props.source?.engine ?? undefined),
  };
  if (parsed.kind === 'playlist' && parsed.listId) {
    return `${embedBase}?${serializeEmbedParams({ listType: 'playlist', list: parsed.listId, ...params })}`;
  }
  return `${embedBase}/${parsed.id}?${serializeEmbedParams(params)}`;
}

/**
 * Parse the `t` parameter from a YouTube URL and convert it to seconds.
 * Supports formats like: `t=171`, `t=171s`, `t=2m51s`, `t=2m`, `t=1h30m15s`.
 */
function parseStartTime(url: string): number | null {
  const tValue = /[?&]t=([\dhms]+)/i.exec(url)?.[1]?.toLowerCase();
  if (!tValue) return null;
  let totalSeconds = 0;
  let hasValue = false;
  const hours = /(\d+)h/.exec(tValue)?.[1];
  if (hours) {
    totalSeconds += Number.parseInt(hours, 10) * 3600;
    hasValue = true;
  }
  const minutes = /(\d+)m/.exec(tValue)?.[1];
  if (minutes) {
    totalSeconds += Number.parseInt(minutes, 10) * 60;
    hasValue = true;
  }
  const seconds = /(\d+)s?$/.exec(tValue)?.[1];
  if (seconds) {
    totalSeconds += Number.parseInt(seconds, 10);
    hasValue = true;
  }
  return hasValue ? totalSeconds : null;
}

const EMBED_BASE = 'https://www.youtube.com/embed';
const EMBED_BASE_NOCOOKIE = 'https://www.youtube-nocookie.com/embed';
const VIDEO_MATCH_SRC =
  /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((?:\w|-){11})/;
const PLAYLIST_MATCH_SRC = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/.*?[?&]list=)([\w-]+)/;
