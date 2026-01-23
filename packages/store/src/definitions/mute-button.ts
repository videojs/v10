export interface MuteButtonState {
  muted: boolean;
  volumeLevel: string;
}

export interface MuteButtonMethods {
  requestMute: () => void;
  requestUnmute: () => void;
}

export interface MuteButtonStateDefinition {
  keys: string[];
  stateTransform: (rawState: any) => MuteButtonState;
  createRequestMethods: (dispatch: (action: { type: string }) => void) => MuteButtonMethods;
}

export const muteButtonStateDefinition: MuteButtonStateDefinition = {
  keys: ['muted', 'volumeLevel'],

  stateTransform: (rawState: any): MuteButtonState => ({
    muted: rawState.muted ?? false,
    volumeLevel: rawState.volumeLevel ?? 'off',
  }),

  createRequestMethods: (dispatch): MuteButtonMethods => ({
    requestMute: () => dispatch({ type: 'muterequest' }),
    requestUnmute: () => dispatch({ type: 'unmuterequest' }),
  }),
};
