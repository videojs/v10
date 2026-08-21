import { VideoCSSVars } from '../custom-media-element';

/** The tag Wistia's package registers its player element under. */
export const WISTIA_PLAYER_TAG = 'wistia-player';

/**
 * Wistia player options, spelled the way `<wistia-player>` spells its JavaScript properties
 * (https://docs.wistia.com/docs/player-attributes-and-properties). They are assigned to the player
 * verbatim, so what you write here is what it reads, and they stay live: the player is an element on the
 * page, so changing one reaches it.
 *
 * The members a media element already has a name for are deliberately absent — `autoplay`, `muted`,
 * `poster`, `preload`, `volume`, `currentTime`, and `playbackRate` are props of their own, `endVideoBehavior`
 * is `loop`, and the eight control-bar switches are `controls`. The index signature still carries anything
 * not listed here, so undocumented knobs and whatever Wistia adds next keep working.
 */
export interface WistiaSource extends Record<string, unknown> {
  /** **Required**. The hashed id of the media to play. */
  mediaId?: string | undefined;
  /** Aspect ratio to reserve space at, before the media data says what the real one is. */
  aspect?: number;
  /** Show the audio-description control, for a media that has an alternate audio track. */
  audioDescriptionControl?: boolean;
  /** Skip viewing-session tracking for heatmaps and other analytics. */
  doNotTrack?: boolean;
  /** Email address to associate this media's viewing sessions with. */
  email?: string;
  /** How the video is sized inside the player when the two aspect ratios disagree. */
  fitStrategy?: 'contain' | 'cover' | 'fill';
  /** Show the playback-speed option inside the settings control. */
  playbackRateControl?: boolean;
  /** Six-character hex color for the controls and accents; the leading `#` is optional. */
  playerColor?: string;
  /** Turn specially crafted links on the page into a playlist for this media. */
  playlistLinks?: string;
  /** Replay a playlist from its first media once the last one ends. */
  playlistLoop?: boolean;
  /** Show the manual quality option inside the settings control. */
  qualityControl?: boolean;
  /** Highest quality automatic playback may pick. */
  qualityMax?: WistiaQuality;
  /** Lowest quality automatic playback may pick. */
  qualityMin?: WistiaQuality;
  /** Pick up where the viewer left off. `'auto'` decides from the media's length and settings. */
  resumable?: boolean | 'auto';
  /** Corner radius of the player, `0` to `24`. */
  roundedPlayer?: number;
  /** Inject the media's metadata into the page's markup. */
  seo?: boolean;
  /** How sound and autoplay work together. `'allow'` falls back to a silent autoplay where a loud one is blocked. */
  silentAutoplay?: boolean | 'allow';
  /** Show the blurred placeholder image while the player loads. */
  swatch?: boolean;
  /** Let the page's background show through the letterbox bars instead of painting them black. */
  transparentLetterbox?: boolean;
  /** Pin playback to one quality instead of adapting. */
  videoQuality?: WistiaQuality | 'auto';
}

/**
 * The quality levels Wistia's automatic playback picks between. Mirrors the package's own
 * `AllowedQualities`, which is the value its player accepts; the docs list `3840` for the top one, but the
 * player names it `2160`.
 */
export type WistiaQuality = 224 | 360 | 540 | 720 | 1080 | 2160;

/**
 * What a Wistia player is started with here, whatever Wistia's own default or the media's customizations in
 * the Wistia app say. A source overrides any of them.
 *
 * Only corner radius so far. Wistia rounds a player to whatever the account configured for the media, and
 * the skin is what rounds it here — see `wistiaPlayerStyle`. `roundedPlayer` is the one radius to square:
 * `playerBorderRadius`, `controlBarBorderRadius`, and `bigPlayButtonBorderRadius` are read-only and derived
 * from it.
 */
export const wistiaPlayerDefaultOptions = {
  roundedPlayer: 0,
} as const satisfies WistiaSource;

/**
 * The style a Wistia player is given.
 *
 * `borderRadius` reads the same custom property a `<video>` does, so a Wistia player is cropped to the
 * skin's corners the way every other media is. `overflow` goes with it: a `<video>` is replaced content and
 * the radius alone clips what it paints, where Wistia paints into child elements, so the box has to clip
 * them too. This is the skin's rounding, and the reason `wistiaPlayerDefaultOptions` squares Wistia's own
 * — two radii on one player would round it twice.
 *
 * `pointerEvents` is off for a chromeless player: it is a video surface under a skin, and the skin is what
 * the viewer is clicking. Left interactive, the player swallows those clicks and answers them with chrome
 * of its own that is not supposed to be there. Every embed here does the same thing — the iframe ones
 * through a `:host(:not([controls]))` rule in a template they own, which a player that brings its own
 * element has no equivalent of.
 */
export function wistiaPlayerStyle(controls: boolean) {
  return {
    borderRadius: `var(${VideoCSSVars.borderRadius})`,
    overflow: 'hidden',
    // `auto` rather than an empty string: it is the initial value of `pointer-events`, so it restores the
    // player as reliably as clearing the declaration would, and it is a value a stylesheet can state.
    pointerEvents: controls ? 'auto' : 'none',
  } as const;
}

/**
 * The eight control-bar switches `controls` drives as a group, since Wistia has no single chromeless flag.
 * `playBarControl` doubles as the one the group is read back from.
 */
export function wistiaControlProps(controls: boolean) {
  return {
    bigPlayButton: controls,
    controlsVisibleOnLoad: controls,
    fullscreenControl: controls,
    playBarControl: controls,
    playPauseControl: controls,
    playPauseNotifier: controls,
    settingsControl: controls,
    volumeControl: controls,
  };
}

/**
 * Extract a Wistia hashed id from a raw ten-character id or any recognized URL: media pages
 * (`<account>.wistia.com/medias/<id>`), embed URLs (`fast.wistia.net/embed/iframe/<id>` and the
 * `medias/<id>.jsonp` and `playlists/<id>` paths), the `wi.st` short host, and the `wvideo=<id>` parameter
 * Wistia links carry.
 */
export function parseWistiaMediaId(src: string): string | null {
  if (!src) return null;
  if (MATCH_HASHED_ID.test(src)) return src;
  return MATCH_SRC.exec(src)?.[1] ?? MATCH_WVIDEO.exec(src)?.[1] ?? null;
}

/**
 * Parse the `wtime` parameter of a Wistia URL and convert it to seconds. Wistia spells timestamps the way
 * it spells them elsewhere: `90`, `90s`, `1m30s`, `1h2m3s`.
 */
export function parseWistiaStartTime(src: string): number | null {
  const value = /[?&]wtime=([\dhms]+)/i.exec(src)?.[1]?.toLowerCase();
  if (!value) return null;
  let totalSeconds = 0;
  let hasValue = false;
  const hours = /(\d+)h/.exec(value)?.[1];
  if (hours) {
    totalSeconds += Number.parseInt(hours, 10) * 3600;
    hasValue = true;
  }
  const minutes = /(\d+)m/.exec(value)?.[1];
  if (minutes) {
    totalSeconds += Number.parseInt(minutes, 10) * 60;
    hasValue = true;
  }
  const seconds = /(\d+)s?$/.exec(value)?.[1];
  if (seconds) {
    totalSeconds += Number.parseInt(seconds, 10);
    hasValue = true;
  }
  return hasValue ? totalSeconds : null;
}

const MATCH_HASHED_ID = /^[a-z\d]{10}$/i;
// The id sits in the same position on every embed path, so the optional segment in front of it covers
// `embed/iframe/<id>`, `embed/medias/<id>.jsonp`, and `embed/playlists/<id>` without a pattern each.
const MATCH_SRC = /(?:wistia\.(?:com|net)|wi\.st)\/(?:medias|embed)\/(?:iframe\/|medias\/|playlists\/)?([a-z\d]{10})/i;
const MATCH_WVIDEO = /[?&]wvideo=([a-z\d]{10})/i;
