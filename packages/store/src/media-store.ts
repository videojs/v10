import { fullscreenFeature, playbackFeature, previewFeature, timeFeature, volumeFeature } from './features';
import { createStore } from './store';
import type { MergeFeatureActions, MergeFeatureStates } from './types';

const mediaStoreCreators = [playbackFeature, previewFeature, timeFeature, volumeFeature, fullscreenFeature] as const;

export function createMediaStore() {
  return createStore(mediaStoreCreators);
}

export type MediaStore = ReturnType<typeof createMediaStore>;

/** Explicit merged state + actions so all feature slices (e.g. previewTime, setPreviewTime) are in the type. */
export type MediaStoreState = MergeFeatureStates<typeof mediaStoreCreators> &
  MergeFeatureActions<typeof mediaStoreCreators>;
