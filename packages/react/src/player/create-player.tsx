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
import { useEffect, useMemo, useState } from 'react';

import { useDestroy } from '../utils/use-destroy';
import { Container, PlayerContextProvider, useMedia, usePlayerContext } from './context';

export interface CreatePlayerConfig<Features extends AnyPlayerFeature[]> {
  features: Features;
  displayName?: string;
}

export interface ProviderProps {
  children: ReactNode;
}

export interface CreatePlayerResult<Store extends PlayerStore> {
  Provider: FC<ProviderProps>;
  Container: typeof Container;
  usePlayer: UsePlayerHook<Store>;
  useMedia: () => Media | null;
}

export type UsePlayerHook<Store extends PlayerStore> = {
  (): Store;
  <R>(selector: (state: InferStoreState<Store>) => R): R;
};

/**
 * Create a player instance with typed store, Provider component, Container, and hooks.
 *
 * @label Video
 * @param config - Player configuration with features and optional display name.
 */
export function createPlayer(config: CreatePlayerConfig<VideoFeatures>): CreatePlayerResult<VideoPlayerStore>;

/**
 * Create a player for audio media.
 *
 * @label Audio
 * @param config - Player configuration with features and optional display name.
 */
export function createPlayer(config: CreatePlayerConfig<AudioFeatures>): CreatePlayerResult<AudioPlayerStore>;

/**
 * Create a player with custom features.
 *
 * @label Generic
 * @param config - Player configuration with features and optional display name.
 */
export function createPlayer<const Features extends AnyPlayerFeature[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<PlayerStore<Features>>;

export function createPlayer(config: CreatePlayerConfig<AnyPlayerFeature[]>): CreatePlayerResult<AnyPlayerStore> {
  function Provider({ children }: ProviderProps): ReactNode {
    const [store, setStore] = useState(() => createStore<PlayerTarget>()(combine(...config.features)));
    const [popupGroup] = useState(() => createPopupGroup());
    const [media, setMedia] = useState<Media | null>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useDestroy(store);

    useEffect(() => {
      if (!media) return;

      // The store may have been destroyed during an asynchronous gap between React
      // effect cleanup and re-setup (e.g., React <Activity> hide → reveal). The
      // useState initializer does not re-run in this case.
      if (store.destroyed) {
        setStore(createStore<PlayerTarget>()(combine(...config.features)));
        return;
      }

      return store.attach({ media, container });
    }, [media, container, store]);

    const value = useMemo(
      () => ({ store, media, setMedia, container, setContainer, popupGroup }),
      [store, media, container, popupGroup]
    );

    return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
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
