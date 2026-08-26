import { serializeEmbedParams } from '../utils';
import type { SpotifyMediaProps } from './props';

/**
 * Spotify engine options, spelled exactly as Spotify spells them (https://developer.spotify.com/documentation/embeds).
 * They are serialized onto the embed URL verbatim, so what you write here is what the embed reads.
 *
 * Spotify publishes only a handful of them, and the ones the host owns are deliberately absent: the start position
 * comes from the `t` parameter on `src`. The index signature still carries anything not listed here, so undocumented
 * knobs and whatever Spotify adds next keep working.
 */
export interface SpotifyEngineConfig extends Record<string, unknown> {
  /** Start position in seconds. */
  t?: number;
  /**
   * `0` renders the embed in its dark theme. Defaults to the light theme. Spotify documents no other value, and the
   * embed goes by whether the parameter is there, so leaving it out is the only way to ask for the default.
   */
  theme?: 0;
  /** Embed the video variant of an episode when it has one. Not a URL parameter: the video embed lives at its own path. */
  preferVideo?: boolean;
  /** `referrerpolicy` for the embed iframe. Not a Spotify embed parameter. */
  referrerPolicy?: ReferrerPolicy;
}

/** Structured Spotify source: which source to play, plus how to play it. */
export interface SpotifySource {
  /** Spotify URL or URI. Mirrors the host's `src` property. */
  src?: string | undefined;
  /** Playback options, keyed by the engine that reads them. */
  engine?: SpotifySourceEngineConfig | undefined;
}

/** The engines a Spotify source can configure. */
export interface SpotifySourceEngineConfig {
  /** Spotify's own embed options, passed through untouched. */
  spotify?: SpotifyEngineConfig | undefined;
}

/** The entities Spotify can embed. */
export type SpotifyEntityType = 'track' | 'episode' | 'album' | 'playlist' | 'show' | 'artist';

/** Parsed pieces of a Spotify source URL or URI. */
export interface ParsedSpotifySource {
  /** Which kind of entity the embed plays; it names the embed path. */
  type: SpotifyEntityType;
  /** Base62 entity id. */
  id: string;
  /** Start position in seconds parsed from the `t` parameter. */
  startTime: number | null;
}

/** Extract a Spotify entity id from any recognized URL or `spotify:` URI. */
export function parseSpotifyEntityId(src: string) {
  return parseSpotifySource(src)?.id ?? null;
}

/**
 * Parse a Spotify source string. Recognizes `open.spotify.com` URLs for every embeddable entity — including the
 * localized (`/intl-de/`) and already-embedded (`/embed/`) forms, since the entity type and id sit in the same place in
 * all of them — `spotify:<type>:<id>` URIs, and start positions via the `t` parameter.
 */
export function parseSpotifySource(src: string): ParsedSpotifySource | null {
  if (!src) return null;

  const match = MATCH_URI.exec(src) ?? MATCH_SRC.exec(src);
  const type = match?.[1]?.toLowerCase() as SpotifyEntityType | undefined;
  const id = match?.[2];
  if (!type || !id) return null;

  return { type, id, startTime: parseStartTime(src) };
}

/** Build the iframe `src` URL for an initial Spotify embed from the given props. */
export function buildSpotifyIframeSrc(src: string, props: Partial<SpotifyMediaProps> = {}) {
  const parsed = parseSpotifySource(src);
  if (!parsed) return '';

  // Neither of these is an embed parameter: `preferVideo` picks the path below,
  // and `referrerPolicy` is an attribute of the iframe hosting the embed.
  const { preferVideo, referrerPolicy: _referrerPolicy, ...spotify } = props.source?.engine?.spotify ?? {};
  const params: Record<string, unknown> = {
    t: parsed.startTime,
    // Spotify-specific knobs (`theme`, `utm_source`, …) flow through here.
    ...spotify,
  };
  const videoPath = preferVideo ? '/video' : '';
  // Spotify publishes so few parameters that most embeds need none at all.
  const query = serializeEmbedParams(params);

  return `${EMBED_BASE}/embed/${parsed.type}/${parsed.id}${videoPath}${query ? `?${query}` : ''}`;
}

/** Parse the `t` parameter from a Spotify share URL. Spotify spells it in seconds. */
function parseStartTime(url: string): number | null {
  const value = /[?&]t=(\d+)/.exec(url)?.[1];

  return value ? Number.parseInt(value, 10) : null;
}

const EMBED_BASE = 'https://open.spotify.com';
// The entity type and id are always the last two path segments, so whatever
// Spotify puts in front of them (`/intl-de/`, `/embed/`) is skipped.
const MATCH_SRC = /open\.spotify\.com\/(?:[\w-]+\/)*?(track|episode|album|playlist|show|artist)\/(\w+)/i;
const MATCH_URI = /^spotify:(track|episode|album|playlist|show|artist):(\w+)$/i;
