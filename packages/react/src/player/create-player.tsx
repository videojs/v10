'use client';

import type { Media, PlayerTarget } from '@videojs/core/dom';
import type { AnyFeature, FeatureStore, UnionFeatureState } from '@videojs/store';
import { createStore } from '@videojs/store';
import { useStore } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { Container, PlayerContextProvider, useMedia, usePlayerContext } from './context';

export interface CreatePlayerConfig<Features extends AnyFeature[]> {
  features: Features;
  displayName?: string;
}

export interface ProviderProps {
  children: ReactNode;
}

export interface CreatePlayerResult<Features extends AnyFeature[]> {
  Provider: (props: ProviderProps) => ReactNode;
  Container: typeof Container;
  usePlayer: UsePlayerHook<Features>;
  useMedia: () => Media | null;
}

type UsePlayerHook<Features extends AnyFeature[]> = {
  (): FeatureStore<Features>;
  <R>(selector: (state: UnionFeatureState<Features>) => R): R;
};

export function createPlayer<const Features extends AnyFeature<PlayerTarget>[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<Features> {
  type Store = FeatureStore<Features>;
  type State = UnionFeatureState<Features>;

  function Provider({ children }: ProviderProps): ReactNode {
    const [store] = useState(() => createStore({ features: config.features }));
    const [media, setMedia] = useState<Media | null>(null);

    useEffect(() => () => store.destroy(), [store]);

    return <PlayerContextProvider value={{ store, media, setMedia }}>{children}</PlayerContextProvider>;
  }

  if (config.displayName) {
    Provider.displayName = `${config.displayName}.Provider`;
  }

  function usePlayer(): Store;
  function usePlayer<R>(selector: (state: State) => R): R;
  function usePlayer<R>(selector?: (state: State) => R): Store | R {
    const { store } = usePlayerContext();
    return useStore(store, selector as any);
  }

  return {
    Provider,
    Container,
    usePlayer: usePlayer as UsePlayerHook<Features>,
    useMedia,
  };
}
