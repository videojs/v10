import type { AnyPlayerStore, MediaContainer, PlayerStore } from '@videojs/core/dom';
import type { ReactiveControllerHost } from '@videojs/element';
import { type Context, type ContextConsumer, createContext } from '@videojs/element/context';
import type { Media } from '@videojs/media/dom';

// ----------------------------------------
// Player Context
// ----------------------------------------

/** @internal */
export const PLAYER_CONTEXT_KEY = Symbol.for('@videojs/player');

/** @internal */
export type PlayerContextValue<Store extends PlayerStore = AnyPlayerStore> = Store;

/**
 * @displayType Context<symbol, {Store}>
 * @internal
 */
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

/** @internal */
export const MEDIA_CONTEXT_KEY = Symbol.for('@videojs/media');

/** @internal */
export interface MediaContextValue {
  media: Media | null;
  registerMedia: (media: Media) => () => void;
}

/** @internal */
export type MediaContext = Context<typeof MEDIA_CONTEXT_KEY, MediaContextValue>;

/** @internal */
export const mediaContext = createContext<MediaContextValue, typeof MEDIA_CONTEXT_KEY>(MEDIA_CONTEXT_KEY);

// ----------------------------------------
// Container Context
// ----------------------------------------

/** @internal */
export const CONTAINER_CONTEXT_KEY = Symbol.for('@videojs/container');

/** @internal */
export interface ContainerContextValue {
  container: MediaContainer | null;
  registerContainer: (container: MediaContainer) => () => void;
}

/** @internal */
export type ContainerContext = Context<typeof CONTAINER_CONTEXT_KEY, ContainerContextValue>;

/** @internal */
export type ContainerContextConsumer = ContextConsumer<ContainerContext, ReactiveControllerHost & HTMLElement>;

/** @internal */
export const containerContext = createContext<ContainerContextValue, typeof CONTAINER_CONTEXT_KEY>(
  CONTAINER_CONTEXT_KEY
);
