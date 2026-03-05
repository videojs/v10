import type { AnyPlayerStore, PlayerStore } from '@videojs/core/dom';
import { type Context, createContext } from '@videojs/element/context';

export const PLAYER_CONTEXT_KEY = Symbol('@videojs/player');

export type PlayerContextValue<Store extends PlayerStore = AnyPlayerStore> = Store;

export type PlayerContext<Store extends PlayerStore = AnyPlayerStore> = Context<
  typeof PLAYER_CONTEXT_KEY,
  PlayerContextValue<Store>
>;

/**
 * The default player context instance for consuming the player store in controllers.
 *
 * @public
 */
export const playerContext = createContext<PlayerContextValue, typeof PLAYER_CONTEXT_KEY>(PLAYER_CONTEXT_KEY);
