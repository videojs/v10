interface PlayerContext {
  readonly player: unknown;
}

/**
 * The player context for dependency injection.
 * @public
 */
export const playerContext: PlayerContext = { player: null };
