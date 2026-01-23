export interface PreviewTimeDisplayState {
  /** The preview time value in seconds */
  previewTime: number | undefined;
}

export interface PreviewTimeDisplayStateDefinition {
  keys: (keyof PreviewTimeDisplayState)[];
  stateTransform: (rawState: any) => PreviewTimeDisplayState;
}

export const previewTimeDisplayStateDefinition: PreviewTimeDisplayStateDefinition = {
  keys: ['previewTime'],
  stateTransform: (rawState: any) => ({
    previewTime: rawState.previewTime ?? 0,
  }),
};
