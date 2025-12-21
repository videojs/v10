
export interface DurationDisplayState {
  /** The raw duration value in seconds */
  duration: number | undefined;
}


export const durationDisplayStateDefinition = {
  keys: ['duration'] as const,
  stateTransform: (rawState: Record<string, any>): DurationDisplayState => {
    const { duration } = rawState;

    return {
      duration,
    };
  },
  createRequestMethods: (_dispatch: (action: { type: string; detail?: any }) => void) => ({}),
};

export type DurationDisplayStateDefinition = typeof durationDisplayStateDefinition;

export type DurationDisplayComponentState = ReturnType<typeof durationDisplayStateDefinition.stateTransform>;

export type DurationDisplayRequestMethods = ReturnType<typeof durationDisplayStateDefinition.createRequestMethods>;
