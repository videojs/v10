'use client';

import type { AnyPlayerFeature, Media, PlayerStore, PlayerTarget } from '@videojs/core/dom';
import type { UnionSliceState } from '@videojs/store';
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

export interface CreatePlayerResult<Features extends AnyPlayerFeature[]> {
  Provider: FC<ProviderProps>;
  Container: typeof Container;
  usePlayer: UsePlayerHook<Features>;
  useMedia: () => Media | null;
}

type UsePlayerHook<Features extends AnyPlayerFeature[]> = {
  (): PlayerStore<Features>;
  <R>(selector: (state: UnionSliceState<Features>) => R): R;
};

export function createPlayer<const Features extends AnyPlayerFeature[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<Features> {
  type Store = PlayerStore<Features>;
  type State = UnionSliceState<Features>;

  function Provider({ children }: ProviderProps): ReactNode {
    const [store] = useState(() => createStore<PlayerTarget>()(combine(...config.features)));
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
