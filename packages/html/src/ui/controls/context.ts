import type { ControlsState, StateAttrMap } from '@videojs/core';
import { createContext } from '@videojs/element/context';
import type { MediaControlsState } from '@videojs/media';

export interface ControlsContextValue {
  state: ControlsState;
  stateAttrMap: StateAttrMap<ControlsState>;
  requestControlsLock: MediaControlsState['requestControlsLock'];
}

const CONTROLS_CONTEXT_KEY = Symbol('@videojs/controls');

export const controlsContext = createContext<ControlsContextValue>(CONTROLS_CONTEXT_KEY);
