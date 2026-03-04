import type { ControlsState, StateAttrMap } from '@videojs/core';
import { createContext } from '@videojs/element/context';

export interface ControlsContextValue {
  state: ControlsState;
  stateAttrMap: StateAttrMap<ControlsState>;
}

const CONTROLS_CONTEXT_KEY = Symbol('@videojs/controls');

export const controlsContext = createContext<ControlsContextValue>(CONTROLS_CONTEXT_KEY);
