import type { AnyPlayerStore, MediaContainer, PlayerStore } from '@videojs/core/dom';
import type { ReactiveControllerHost } from '@videojs/element';
import { type Context, type ContextConsumer, createContext } from '@videojs/element/context';
import type { Media } from '@videojs/media/dom';

// ----------------------------------------
// Player Context
// ----------------------------------------

export const PLAYER_CONTEXT_KEY = Symbol.for('@videojs/player');

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

// ----------------------------------------
// Media Context
// ----------------------------------------

export const MEDIA_CONTEXT_KEY = Symbol.for('@videojs/media');

export interface MediaContextValue {
  media: Media | null;
  registerMedia: (media: Media) => () => void;
}

export type MediaContext = Context<typeof MEDIA_CONTEXT_KEY, MediaContextValue>;

export const mediaContext = createContext<MediaContextValue, typeof MEDIA_CONTEXT_KEY>(MEDIA_CONTEXT_KEY);

// ----------------------------------------
// Container Context
// ----------------------------------------

export const CONTAINER_CONTEXT_KEY = Symbol.for('@videojs/container');

export interface ContainerContextValue {
  container: MediaContainer | null;
  registerContainer: (container: MediaContainer) => () => void;
}

export type ContainerContext = Context<typeof CONTAINER_CONTEXT_KEY, ContainerContextValue>;

export type ContainerContextConsumer = ContextConsumer<ContainerContext, ReactiveControllerHost & HTMLElement>;

export const containerContext = createContext<ContainerContextValue, typeof CONTAINER_CONTEXT_KEY>(
  CONTAINER_CONTEXT_KEY
);
