/**
 * One ported player.style theme, as the sandbox harness needs to know it.
 *
 * The harness renders two frames per theme: the theme rebuilt on Video.js 10 elements, and the published media-chrome
 * original beside it. Everything that differs between themes lives here.
 */
export interface PlayerStyleTheme {
  /** The theme's package name after the scope, which is also its route and its custom element suffix. */
  readonly name: string;
  /** Shown in the comparison header. */
  readonly label: string;
  /** Which preset the port mounts, and whether the media is a `<video>` or an `<audio>`. */
  readonly player: 'video' | 'audio';
  /**
   * Mount the live preset (`live-video-player`) and an HLS media element. The originals branch on stream type inside
   * one package, so a live port is a second skin against the same published theme.
   */
  readonly live?: boolean;
  /** The published package to compare against, when it differs from the port's name. Defaults to `name`. */
  readonly package?: string;
  /** The source the comparison lands on when the URL names none — live ports need a live one to say anything. */
  readonly defaultSource?: string;
  /** The published `@player.style/<name>` version the reference frame loads, pinned so the comparison is stable. */
  readonly version: string;
  /**
   * Aspect ratio for the frame around the player, as a CSS `aspect-ratio` value. Audio themes size to their content, so
   * they leave this unset.
   */
  readonly aspectRatio?: string;
}

/** The published theme, pinned, straight from a CDN. */
export function themeModuleUrl(theme: PlayerStyleTheme): string {
  return `https://cdn.jsdelivr.net/npm/@player.style/${theme.package ?? theme.name}@${theme.version}/+esm`;
}

/** The element the published theme registers. */
export function themeTagName(theme: PlayerStyleTheme): string {
  return `media-theme-${theme.package ?? theme.name}`;
}

/** The element the ported skin registers. Distinct from the original's tag, so both can exist in one registry. */
export function portedTagName({ name }: PlayerStyleTheme): string {
  return `player-style-${name}-skin`;
}
