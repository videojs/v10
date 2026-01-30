import { fullscreenFeature, playbackFeature, previewFeature, timeFeature, volumeFeature } from './features';
import { createStore } from './store';
import type { MergeFeatureActions, MergeFeatureStates } from './types';

const playerStoreCreators = [playbackFeature, previewFeature, timeFeature, volumeFeature, fullscreenFeature] as const;

export function createPlayerStore() {
  return createStore(playerStoreCreators);
}

export type PlayerStore = ReturnType<typeof createPlayerStore>;

/** Explicit merged state + actions so all feature slices (e.g. previewTime, setPreviewTime) are in the type. */
export type PlayerStoreState = MergeFeatureStates<typeof playerStoreCreators> &
  MergeFeatureActions<typeof playerStoreCreators>;
