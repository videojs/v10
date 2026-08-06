/**
 * Developer-facing copy for what this engine reports.
 *
 * Everything here reaches a **console**, never a viewer. Viewer-facing copy for
 * a fatal condition is the presentation layer's to compose: the engine reports a
 * code, and a consumer maps that code to localized text it owns.
 *
 * Plain string constants, one export each. Nothing is parameterized — a message
 * that names the engine has to be built at the call site from state the engine
 * carries around solely to say it, which is a lot of plumbing for a console
 * prefix. Separate exports rather than one object so a composition that logs
 * neither notice doesn't carry their bytes.
 */

/**
 * Logged when a fatal `SVTA_UNSUPPORTED_PLAYBACK_FEATURE` is surfaced.
 *
 * The developer's half of that event; the viewer gets the localized copy the
 * code maps to. One sentence is enough because the specifics — which container,
 * which rendition, whether it was DRM — stay structured on the reported
 * conditions logged beside it.
 */
export const UNSUPPORTED_PLAYBACK_FEATURE_MESSAGE =
  "Can't play this source: it requires an unsupported playback feature.";

/**
 * LL-HLS delivery, played as standard live. The parser ignores partial segments
 * and the loader fetches whole ones, so latency lands wherever `HOLD-BACK` puts
 * it — the stream plays, just not at the latency it was published for.
 */
export const LOW_LATENCY_UNSUPPORTED_MESSAGE =
  'Low-Latency HLS is unsupported; playing as standard live at higher latency.';

/**
 * `#EXT-X-PLAYLIST-TYPE:EVENT` — a growing window, which is how DVR is
 * delivered. It plays, but the seekable-range and live-edge handling for it is
 * newer and less exercised than sliding-window live.
 */
export const DVR_EXPERIMENTAL_MESSAGE = 'DVR support for EVENT playlists is experimental.';
