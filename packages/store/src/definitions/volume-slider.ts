export interface VolumeSliderState {
  volume: number;
  muted: boolean;
  volumeLevel: 'high' | 'medium' | 'low' | 'off';
}

export interface VolumeSliderMethods {
  requestVolumeChange: (volume: number) => void;
}

export interface VolumeSliderStateDefinition {
  keys: string[];
  stateTransform: (rawState: any) => VolumeSliderState;
  createRequestMethods: (dispatch: (action: { type: string; detail?: any }) => void) => VolumeSliderMethods;
}

export const volumeSliderStateDefinition: VolumeSliderStateDefinition = {
  keys: ['volume', 'muted', 'volumeLevel'],
  stateTransform: (rawState: any) => ({
    volume: rawState.volume ?? 1,
    muted: rawState.muted ?? false,
    volumeLevel: rawState.volumeLevel ?? 'high',
  }),
  createRequestMethods: dispatch => ({
    /**
     * @TODO Unmuting is owned by the "request-map" in media-chrome.
     * The closest equivalent to that is the "actions" in the current architecture.
     * Should unmuting live here (even if "here" gets promoted to the state model) or "actions" or state setter?
     * Currently this is solved in the state setter (as is the corresponding unmute behavior). See mediators/audible for details. (CJP)
     */
    requestVolumeChange: (volume: number) => {
      // if (volume > 0) {
      //   dispatch({ type: 'unmuterequest' });
      // }
      dispatch({ type: 'volumerequest', detail: volume });
    },
  }),
};
