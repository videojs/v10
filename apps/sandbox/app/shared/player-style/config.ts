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
  /** The published `@player.style/<name>` version the reference frame loads, pinned so the comparison is stable. */
  readonly version: string;
  /**
   * Aspect ratio for the frame around the player, as a CSS `aspect-ratio` value. Audio themes size to their content, so
   * they leave this unset.
   */
  readonly aspectRatio?: string;
}

/** The published theme, pinned, straight from a CDN. */
export function themeModuleUrl({ name, version }: PlayerStyleTheme): string {
  return `https://cdn.jsdelivr.net/npm/@player.style/${name}@${version}/+esm`;
}

/** The element the published theme registers. */
export function themeTagName({ name }: PlayerStyleTheme): string {
  return `media-theme-${name}`;
}

/** The element the ported skin registers. Distinct from the original's tag, so both can exist in one registry. */
export function portedTagName({ name }: PlayerStyleTheme): string {
  return `player-style-${name}-skin`;
}
