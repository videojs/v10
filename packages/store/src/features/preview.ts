import type { FeatureActions, FeatureCreator, FeatureState } from '../types';

export const preview = (() => ({
  initialState: {
    /** Preview time in seconds (e.g. from hover on seek bar) */
    previewTime: 0,
  },

  actions: (_, set) => ({
    setPreviewTime(value: number) {
      set({ previewTime: value });
    },
  }),
})) satisfies FeatureCreator<{}>;

export type PreviewState = FeatureState<typeof preview>;
export type PreviewActions = FeatureActions<typeof preview>;
