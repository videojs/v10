import { type Context, createContext } from '@lit/context';
import type { AnyPlayerStore, Media, PlayerStore } from '@videojs/core/dom';

export const PLAYER_CONTEXT_KEY = Symbol('@videojs/player');

export interface PlayerContextValue<Store extends PlayerStore = AnyPlayerStore> {
  store: Store;
  media: Media | null;
}

export type PlayerContext<Store extends PlayerStore = AnyPlayerStore> = Context<
  typeof PLAYER_CONTEXT_KEY,
  PlayerContextValue<Store>
>;

export const playerContext = createContext<PlayerContextValue, typeof PLAYER_CONTEXT_KEY>(PLAYER_CONTEXT_KEY);
