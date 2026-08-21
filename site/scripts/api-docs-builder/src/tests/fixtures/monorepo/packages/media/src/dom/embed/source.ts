/**
 * Mock structured source for the iframe-backed host — mirrors YouTubeSource.
 *
 * Declared in its own file on purpose: the real engine configs live in
 * `source.ts` for most providers but in `media.ts` for Vimeo, so the builder
 * must find them by following the `source` property's type rather than by
 * guessing a filename.
 */

/** Mock engine options, mirroring a provider's embed parameters. */
export interface EmbedEngineConfig extends Record<string, unknown> {
  /** Player interface language, as a BCP 47 tag. */
  hl?: string;
  /** Show captions by default. Defaults to `0`. */
  cc_load_policy?: 0 | 1;
  /** `referrerpolicy` for the embed iframe. Not an embed parameter. */
  referrerPolicy?: ReferrerPolicy;
  // No JSDoc: every member reaches the generated reference, described or not,
  // so this one appears with a name and type and no description.
  undocumented?: string;
}

/** The engines a mock embed source can configure. */
export interface EmbedSourceEngineConfig {
  /** The provider's own embed parameters, passed through untouched. */
  embed?: EmbedEngineConfig | undefined;
}

/** Mock structured source: which source to play, plus how to play it. */
export interface EmbedSource {
  /** Embed URL or id. Mirrors the host's `src` property. */
  src?: string | undefined;
  /** Playback options, keyed by the engine that reads them. */
  engine?: EmbedSourceEngineConfig | undefined;
}
