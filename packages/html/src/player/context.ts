import type { AnyPlayerStore, Media, MediaContainer, PlayerStore, PopupGroup } from '@videojs/core/dom';
import type { ReactiveControllerHost } from '@videojs/element';
import { type Context, type ContextConsumer, createContext } from '@videojs/element/context';

// ----------------------------------------
// Player Context
// ----------------------------------------

/** Cross-realm symbol identifying the player store context. */
export const PLAYER_CONTEXT_KEY = Symbol.for('@videojs/player');

/** Value carried on `playerContext` — the live player store. */
export type PlayerContextValue<Store extends PlayerStore = AnyPlayerStore> = Store;

/** Typed context handle for the player store. */
export type PlayerContext<Store extends PlayerStore = AnyPlayerStore> = Context<
  typeof PLAYER_CONTEXT_KEY,
  PlayerContextValue<Store>
>;

/**
 * Default player context instance — descendants consume it to access the player store.
 *
 * @public
 */
export const playerContext = createContext<PlayerContextValue, typeof PLAYER_CONTEXT_KEY>(PLAYER_CONTEXT_KEY);

// ----------------------------------------
// Media Context
// ----------------------------------------

/** Cross-realm symbol identifying the media element context. */
export const MEDIA_CONTEXT_KEY = Symbol.for('@videojs/media');

/** Value carried on `mediaContext` — the current media element and a setter for descendants to register one. */
export interface MediaContextValue {
  /** Current media element, or `null` when none is attached. */
  media: Media | null;
  /** Called by descendants to register or clear the active media element. */
  setMedia: (media: Media | null) => void;
}

/** Typed context handle for the media element registration. */
export type MediaContext = Context<typeof MEDIA_CONTEXT_KEY, MediaContextValue>;

/** Default media context instance — media elements use it to register with their provider. */
export const mediaContext = createContext<MediaContextValue, typeof MEDIA_CONTEXT_KEY>(MEDIA_CONTEXT_KEY);

// ----------------------------------------
// Container Context
// ----------------------------------------

/** Cross-realm symbol identifying the media container context. */
export const CONTAINER_CONTEXT_KEY = Symbol.for('@videojs/container');

/** Value carried on `containerContext` — the active container, a setter, and the shared popup group. */
export interface ContainerContextValue {
  /** Current container element, or `null` when none is attached. */
  container: MediaContainer | null;
  /** Called by descendants to register or clear the active container element. */
  setContainer: (container: MediaContainer | null) => void;
  /** Shared popup group that coordinates open popovers, menus, and tooltips. */
  popupGroup?: PopupGroup;
}

/** Typed context handle for container registration. */
export type ContainerContext = Context<typeof CONTAINER_CONTEXT_KEY, ContainerContextValue>;

/** Consumer alias bound to `ContainerContext` for use inside reactive elements. */
export type ContainerContextConsumer = ContextConsumer<ContainerContext, ReactiveControllerHost & HTMLElement>;

/** Default container context instance — container elements use it to register with their provider. */
export const containerContext = createContext<ContainerContextValue, typeof CONTAINER_CONTEXT_KEY>(
  CONTAINER_CONTEXT_KEY
);
