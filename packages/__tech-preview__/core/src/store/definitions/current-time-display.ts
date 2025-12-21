export interface CurrentTimeDisplayState {
  /** The current time value in seconds */
  currentTime: number | undefined;
  /** The total duration in seconds (for future functionality) */
  duration: number | undefined;
}

export const currentTimeDisplayStateDefinition = {
  keys: ['currentTime', 'duration'] as const,
  stateTransform: (rawState: Record<string, any>): CurrentTimeDisplayState => {
    const { currentTime, duration } = rawState;

    return {
      currentTime,
      duration,
    };
  },
  createRequestMethods: (_dispatch: (action: { type: string; detail?: any }) => void) => ({}),
};

export type CurrentTimeDisplayStateDefinition = typeof currentTimeDisplayStateDefinition;

export type CurrentTimeDisplayComponentState = ReturnType<typeof currentTimeDisplayStateDefinition.stateTransform>;

export type CurrentTimeDisplayRequestMethods = ReturnType<
  typeof currentTimeDisplayStateDefinition.createRequestMethods
>;
