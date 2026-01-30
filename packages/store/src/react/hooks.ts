/** @TODO !!! Revisit for SSR (CJP) */
import type { MediaStore, MediaStoreState } from '@videojs/store';
import { shallowEqual } from '@videojs/utils';

import { useContext } from 'react';

import { MediaContext } from './context';
import { useSyncExternalStoreWithSelector } from './use-sync-external-store';

const identity = (x?: any) => x;

export function useMediaStore(): MediaStore {
  return useContext(MediaContext);
}

export function useMediaRef(): (media: HTMLMediaElement | null) => void {
  const store = useContext(MediaContext) as MediaStore;
  return (media: HTMLMediaElement | null): void => {
    store.attach({ media });
  };
}

export function useMediaSelector<Selection>(
  selector: (state: MediaStoreState) => Selection,
  equalityFn: (a: Selection, b: Selection) => boolean = shallowEqual as (a: Selection, b: Selection) => boolean
): Selection {
  const store = useContext(MediaContext) as MediaStore;
  return useSyncExternalStoreWithSelector(
    store?.subscribe ?? identity,
    store?.getState ?? identity,
    store?.getState ?? identity,
    selector,
    equalityFn
  );
}
