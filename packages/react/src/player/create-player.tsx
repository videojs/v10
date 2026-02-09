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
import type { InferStoreState } from '@videojs/store';
import { combine, createStore } from '@videojs/store';
import { useStore } from '@videojs/store/react';
import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';

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

export function createPlayer(config: CreatePlayerConfig<VideoFeatures>): CreatePlayerResult<VideoPlayerStore>;

export function createPlayer(config: CreatePlayerConfig<AudioFeatures>): CreatePlayerResult<AudioPlayerStore>;

export function createPlayer<const Features extends AnyPlayerFeature[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<PlayerStore<Features>>;

export function createPlayer(config: CreatePlayerConfig<AnyPlayerFeature[]>): CreatePlayerResult<AnyPlayerStore> {
  function Provider({ children }: ProviderProps): ReactNode {
    const [store] = useState(() => createStore<PlayerTarget>()(combine(...config.features)));
    const [media, setMedia] = useState<Media | null>(null);

    useEffect(() => () => store.destroy(), [store]);

    return <PlayerContextProvider value={{ store, media, setMedia }}>{children}</PlayerContextProvider>;
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
