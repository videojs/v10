'use client';

import {
  type AnyPlayerFeature,
  type AnyPlayerStore,
  type AudioFeatures,
  type AudioPlayerStore,
  combinePlayerProviderDefinitions,
  createPopupGroup,
  type InferPlayerProviderConfig,
  type PlayerProviderDefinition,
  type PlayerStore,
  type PlayerTarget,
  setPlayerProviderValue,
  type VideoFeatures,
  type VideoPlayerStore,
} from '@videojs/core/dom';
import type { Media } from '@videojs/media/dom';
import type { InferStoreState } from '@videojs/store';
import { combine, createStore } from '@videojs/store';
import { useStore } from '@videojs/store/react';
import type { FC, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useDestroy } from '../utils/use-destroy';
import { Container } from './container';
import { PlayerContextProvider, useMedia, usePlayerContext } from './context';

export interface CreatePlayerConfig<Features extends AnyPlayerFeature[]> {
  features: Features;
  displayName?: string;
}

export type ProviderProps<Config = object> = {
  [Key in keyof Config]?: Config[Key] | undefined;
} & {
  children: ReactNode;
};

export interface CreatePlayerResult<Store extends PlayerStore> {
  Provider: FC<ProviderProps<InferPlayerProviderConfig<Store>>>;
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
  const slice = combine(...config.features);
  const provider = combinePlayerProviderDefinitions(config.features);
  const providerKeys = Object.keys(provider);

  function createConfiguredStore(values: Record<string, unknown>) {
    const store = createStore<PlayerTarget>()(slice);
    applyProviderValues(store, provider, values);
    return store;
  }

  function Provider(props: ProviderProps<any>): ReactNode {
    const { children } = props;
    // Only inputs declared by selected features are forwarded to store actions.
    const providerValues = pickProviderValues(props, providerKeys);
    const [store, setStore] = useState(() => createConfiguredStore(providerValues));
    const syncedValues = useRef({ store, values: providerValues });
    const [popupGroup] = useState(() => createPopupGroup());
    const [media, setMedia] = useState<Media | null>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useDestroy(store);

    // Sync committed provider props to the existing store.
    useLayoutEffect(() => {
      const previous = syncedValues.current;

      // Replacement stores are seeded from this render's props during creation.
      if (previous.store !== store) {
        syncedValues.current = { store, values: providerValues };
        return;
      }

      for (const key of providerKeys) {
        if (Object.is(previous.values[key], providerValues[key])) continue;
        setPlayerProviderValue(store, provider[key]!, providerValues[key]);
      }

      syncedValues.current = { store, values: providerValues };
    });

    useEffect(() => {
      if (!media) return;

      // The store may have been destroyed during an asynchronous gap between React
      // effect cleanup and re-setup (e.g., React <Activity> hide → reveal). The
      // useState initializer does not re-run in this case.
      if (store.destroyed) {
        setStore(createConfiguredStore(syncedValues.current.values));
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

function pickProviderValues(props: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, props[key]]));
}

function applyProviderValues(store: object, provider: PlayerProviderDefinition, values: Record<string, unknown>): void {
  for (const key of Object.keys(provider)) {
    setPlayerProviderValue(store, provider[key]!, values[key]);
  }
}
