import { fullscreen, playback, preview, time, volume } from './features';
import { createStore } from './store';
import type { MergeFeatureActions, MergeFeatureStates } from './types';

const features = [playback, preview, time, volume, fullscreen] as const;

export const createPlayerStore = () => createStore(...features);

export type PlayerStore = ReturnType<typeof createPlayerStore>;

/** Explicit merged state + actions so all feature slices (e.g. previewTime, setPreviewTime) are in the type. */
export type PlayerStoreState = MergeFeatureStates<typeof features> & MergeFeatureActions<typeof features>;
