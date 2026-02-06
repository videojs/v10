/** @TODO !!! Revisit for SSR (CJP) */
import type { PlayerStore, PlayerStoreState } from '@videojs/store';
import { shallowEqual } from '@videojs/utils';

import { useContext, useEffect } from 'react';

import { PlayerContext } from './context';
import { useSyncExternalStoreWithSelector } from './use-sync-external-store';

const identity = (x?: any) => x;

export function usePlayerStore(): PlayerStore {
  return useContext(PlayerContext);
}

export function useMediaRef(): (media: HTMLMediaElement | null) => void {
  const store = useContext(PlayerContext) as PlayerStore;
  return (media: HTMLMediaElement | null): void => {
    store.attach({ media });
  };
}

export function useMedia<T>(media: T): T {
  const store = useContext(PlayerContext) as PlayerStore;
  useEffect(() => {
    store.attach({ media: media as HTMLMediaElement });
  }, [media, store.attach]);
  return media;
}

export function usePlayer<Selection>(
  selector: (state: PlayerStoreState) => Selection,
  equalityFn: (a: Selection, b: Selection) => boolean = shallowEqual as (a: Selection, b: Selection) => boolean
): Selection {
  const store = useContext(PlayerContext) as PlayerStore;
  return useSyncExternalStoreWithSelector(
    store?.subscribe ?? identity,
    store?.getState ?? identity,
    store?.getInitialState ?? identity,
    selector,
    equalityFn
  );
}
