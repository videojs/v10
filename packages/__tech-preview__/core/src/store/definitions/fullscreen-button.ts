export interface FullscreenButtonState {
  fullscreen: boolean;
}

export interface FullscreenButtonMethods {
  requestEnterFullscreen: () => void;
  requestExitFullscreen: () => void;
}

export interface FullscreenButtonStateDefinition {
  keys: string[];
  stateTransform: (rawState: any) => FullscreenButtonState;
  createRequestMethods: (dispatch: (action: { type: string; detail?: any }) => void) => FullscreenButtonMethods;
}

export const fullscreenButtonStateDefinition: FullscreenButtonStateDefinition = {
  keys: ['fullscreen'],
  stateTransform: (rawState: any): FullscreenButtonState => ({
    fullscreen: rawState.fullscreen ?? false,
  }),
  createRequestMethods: (dispatch): FullscreenButtonMethods => ({
    requestEnterFullscreen: () => dispatch({ type: 'fullscreenrequest', detail: true }),
    requestExitFullscreen: () => dispatch({ type: 'fullscreenrequest', detail: false }),
  }),
};
