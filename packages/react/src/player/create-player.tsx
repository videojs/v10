'use client';

import type {
  AnyPlayerFeature,
  AnyPlayerStore,
  AudioFeatures,
  AudioPlayerStore,
  Media,
  PlayerStore,
  PlayerTarget,
  VideoFeatures,
  VideoPlayerStore,
} from '@videojs/core/dom';
import { createPopupGroup } from '@videojs/core/dom';
import type { InferStoreState } from '@videojs/store';
import { combine, createStore } from '@videojs/store';
import { useStore } from '@videojs/store/react';
import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useDestroy } from '../utils/use-destroy';
import { Container, PlayerContextProvider, useMedia, usePlayerContext } from './context';

/** Configuration passed to `createPlayer`. */
export interface CreatePlayerConfig<Features extends AnyPlayerFeature[]> {
  /** Composed feature set that determines the player store's shape and behavior. */
  features: Features;
  /** Optional display name applied to the generated `Provider` for React DevTools. */
  displayName?: string;
}

/** Props for the `Provider` component returned by `createPlayer`. */
export interface ProviderProps {
  /** Content rendered inside the player provider. */
  children: ReactNode;
}

/** Components and hooks returned by `createPlayer`, typed to the configured feature set. */
export interface CreatePlayerResult<Store extends PlayerStore> {
  /** Wraps children with a typed Player Provider that owns the store and media lifecycle. */
  Provider: FC<ProviderProps>;
  /** Root container component bound to the player provider. */
  Container: typeof Container;
  /** Hook that returns the typed store, or a selected slice via a selector. */
  usePlayer: UsePlayerHook<Store>;
  /** Hook that returns the attached media element, or `null` before attachment. */
  useMedia: () => Media | null;
}

/** Typed `usePlayer` hook with optional selector. */
export type UsePlayerHook<Store extends PlayerStore> = {
  (): Store;
  <R>(selector: (state: InferStoreState<Store>) => R): R;
};

/**
 * Create a video player instance with a typed store, `Provider`, `Container`, and hooks.
 *
 * Pair with a media component (such as `<Video>` or `<HlsVideo>`) inside the
 * returned `Container` to attach the underlying media element to the player.
 *
 * @label Video
 * @param config - Player configuration with features and optional display name.
 * @see https://videojs.org/docs/framework/react/reference/create-player
 */
export function createPlayer(config: CreatePlayerConfig<VideoFeatures>): CreatePlayerResult<VideoPlayerStore>;

/**
 * Create an audio player instance with a typed store, `Provider`, `Container`, and hooks.
 *
 * Pair with an audio media component (such as `<Audio>` or `<MuxAudio>`) inside
 * the returned `Container` to attach the underlying media element to the player.
 *
 * @label Audio
 * @param config - Player configuration with features and optional display name.
 * @see https://videojs.org/docs/framework/react/reference/create-player
 */
export function createPlayer(config: CreatePlayerConfig<AudioFeatures>): CreatePlayerResult<AudioPlayerStore>;

/**
 * Create a player instance from a custom feature set, typed to that exact composition.
 *
 * Use this overload when assembling features that don't match the prebuilt
 * `VideoFeatures` or `AudioFeatures` shapes.
 *
 * @label Generic
 * @param config - Player configuration with features and optional display name.
 * @see https://videojs.org/docs/framework/react/reference/create-player
 */
export function createPlayer<const Features extends AnyPlayerFeature[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<PlayerStore<Features>>;

export function createPlayer(config: CreatePlayerConfig<AnyPlayerFeature[]>): CreatePlayerResult<AnyPlayerStore> {
  function Provider({ children }: ProviderProps): ReactNode {
    const [store] = useState(() => createStore<PlayerTarget>()(combine(...config.features)));
    const [popupGroup] = useState(() => createPopupGroup());
    const [media, setMedia] = useState<Media | null>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useDestroy(store);

    useEffect(() => {
      if (!media) return;
      return store.attach({ media, container });
    }, [media, container, store]);

    return (
      <PlayerContextProvider value={{ store, media, setMedia, container, setContainer, popupGroup }}>
        {children}
      </PlayerContextProvider>
    );
  }

  if (__DEV__ && config.displayName) {
    Provider.displayName = `${config.displayName}.Provider`;
  }

  function usePlayer<R>(selector?: (state: object) => R): AnyPlayerStore | R {
    const { store } = usePlayerContext();
    return useStore(store, selector as any);
  }

  return {
    Provider,
    Container,
    usePlayer,
    useMedia,
  };
}
