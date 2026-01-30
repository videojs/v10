import { createFeature } from '../store';
import type { FeatureActions, FeatureState } from '../types';

export const previewFeature = createFeature()(() => ({
  initialState: {
    /** Preview time in seconds (e.g. from hover on seek bar) */
    previewTime: 0,
  },

  actions: (_, set) => ({
    setPreviewTime(value: number) {
      set?.({ previewTime: value });
    },
  }),
}));

export type PreviewState = FeatureState<typeof previewFeature>;
export type PreviewActions = FeatureActions<typeof previewFeature>;
