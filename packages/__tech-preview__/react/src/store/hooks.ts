/** @TODO !!! Revisit for SSR (CJP) */
import type { MediaStore } from '@videojs/core/store';

import { useContext } from 'react';

import { MediaContext } from './context';
import { useSyncExternalStoreWithSelector } from './use-sync-external-store';

const identity = (x?: any) => x;

export function useMediaStore(): MediaStore {
  return useContext(MediaContext);
}

export function useMediaDispatch(): (value: any) => unknown {
  const store = useContext(MediaContext);
  const dispatch = store?.dispatch ?? identity;
  return (value: any) => {
    return dispatch(value);
  };
}

export function useMediaRef() {
  const dispatch = useMediaDispatch();

  return (element: any): void => {
    // NOTE: This should get invoked with `null` when using as a `ref` callback whenever
    // the corresponding react media element instance (e.g. a `<video>`) is being removed.
    /*
    { type: 'mediastateownerchangerequest', detail: media }
    */
    dispatch({ type: 'mediastateownerchangerequest', detail: element });
  };
}

export const refEquality = (a: any, b: any): boolean => a === b;

export function useMediaSelector<S = any>(
  selector: (state: any) => S,
  equalityFn: (a: S, b: S) => boolean = refEquality,
): S {
  const store = useContext(MediaContext);
  const selectedState = useSyncExternalStoreWithSelector(
    store?.subscribe ?? identity,
    store?.getState ?? identity,
    store?.getState ?? identity,
    selector,
    equalityFn,
  ) as S;

  return selectedState;
}
