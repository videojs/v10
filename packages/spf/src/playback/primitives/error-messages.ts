/**
 * Developer-facing copy for what this engine reports.
 *
 * Everything here reaches a **console**, never a viewer. Viewer-facing copy for
 * a fatal condition is the presentation layer's to compose: the engine reports a
 * code, and a consumer maps that code to localized text it owns. An engine that
 * ships English sentences can't be localized and decides presentation from below
 * the presentation layer, so it doesn't.
 *
 * That leaves two audiences and two registers. A developer needs to know *what
 * specifically* the engine refused and *which* engine refused it — enough to
 * pick a differently-equipped Media. A viewer needs a sentence in their own
 * language, which they get from the i18n key the code maps to.
 */

/**
 * Subject used when the composition hasn't said what it's called. Phrased to
 * read as the sentence subject it becomes, so an unconfigured engine still
 * produces a grammatical sentence.
 *
 * Whatever a composition passes instead appears verbatim, so it has to read as
 * prose ("Mux Player"), not as an identifier ("mux-video").
 */
export const DEFAULT_PLAYER_SOFTWARE_NAME = 'This player';

/**
 * The single sentence the engine says about a fatal
 * `SVTA_UNSUPPORTED_PLAYBACK_FEATURE`.
 *
 * Logged, never surfaced: the viewer gets the localized copy that consumers map
 * the code to, and this is the developer's half of the same event. Which is why
 * one string is enough — the specifics (which container, which rendition,
 * whether it was DRM) stay structured on the reported conditions and get logged
 * alongside it, where they're inspectable instead of flattened into prose.
 */
export const unsupportedPlaybackFeature = (playerSoftwareName: string) =>
  `${playerSoftwareName} can’t play this source: it needs a playback feature this engine doesn’t implement.`;

/**
 * Copy for conditions that don't stop playback but do mean the viewer is getting
 * something other than what the publisher configured. Developer-facing in
 * practice — they reach the console, not the error dialog, because nothing here
 * is a failure the viewer can act on.
 */
export const NOTICE_MESSAGES = {
  /**
   * LL-HLS delivery, played as standard live. The parser ignores partial segments
   * and the loader fetches whole ones, so latency lands wherever `HOLD-BACK` puts
   * it — the stream plays, just not at the latency it was published for.
   */
  lowLatencyUnsupported: (playerSoftwareName: string) =>
    `${playerSoftwareName} doesn’t support Low-Latency HLS. This stream will play as standard live, at higher latency.`,
  /**
   * `#EXT-X-PLAYLIST-TYPE:EVENT` — a growing window, which is how DVR is
   * delivered. It plays, but the seekable-range and live-edge handling for it is
   * newer and less exercised than sliding-window live.
   */
  dvrExperimental: (playerSoftwareName: string) =>
    `${playerSoftwareName}'s DVR support for EVENT playlists is experimental.`,
} as const;
