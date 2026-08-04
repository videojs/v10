'use client';

import {
  type AnyPlayerFeature,
  type AnyPlayerStore,
  type AudioFeatures,
  type AudioPlayerStore,
  createPopupGroup,
  type PlayerStore,
  type PlayerTarget,
  type VideoFeatures,
  type VideoPlayerStore,
} from '@videojs/core/dom';
import type { Media } from '@videojs/media/dom';
import type { ConfigPatch, InferStoreConfig, InferStoreState } from '@videojs/store';
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

export type ProviderProps<Config = object> = ConfigPatch<Config> & {
  children: ReactNode;
};

export interface CreatePlayerResult<Store extends PlayerStore> {
  Provider: FC<ProviderProps<InferStoreConfig<Store>>>;
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
  const configKeys = Object.keys(slice.config ?? {});

  function Provider(props: ProviderProps<any>): ReactNode {
    const { children } = props;
    const providerConfig = readProviderConfig(props, configKeys);
    const [store, setStore] = useState(() => createStore<PlayerTarget>()(slice, { config: providerConfig }));
    const syncedConfig = useRef({ store, values: providerConfig });
    const [popupGroup] = useState(() => createPopupGroup());
    const [media, setMedia] = useState<Media | null>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useDestroy(store);

    useLayoutEffect(() => {
      const previous = syncedConfig.current;

      // Replacement stores are seeded from this render's props during creation.
      if (previous.store !== store) {
        syncedConfig.current = { store, values: providerConfig };
        return;
      }

      const patch: Record<string, unknown> = {};
      let changed = false;

      for (const key of configKeys) {
        if (Object.is(previous.values[key], providerConfig[key])) continue;
        patch[key] = providerConfig[key];
        changed = true;
      }

      if (changed) store.$config.set(patch);
      syncedConfig.current = { store, values: providerConfig };
    });

    useEffect(() => {
      if (!media) return;

      // The store may have been destroyed during an asynchronous gap between React
      // effect cleanup and re-setup (e.g., React <Activity> hide → reveal). The
      // useState initializer does not re-run in this case.
      if (store.destroyed) {
        setStore(createStore<PlayerTarget>()(slice, { config: syncedConfig.current.values }));
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

function readProviderConfig(props: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, props[key]]));
}
