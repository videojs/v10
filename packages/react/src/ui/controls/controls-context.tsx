'use client';

import type { ControlsState, StateAttrMap } from '@videojs/core';
import { createContext, useContext } from 'react';

export interface ControlsContextValue {
  state: ControlsState;
  stateAttrMap: StateAttrMap<ControlsState>;
}

const ControlsContext = createContext<ControlsContextValue | undefined>(undefined);

export const ControlsContextProvider = ControlsContext.Provider;

export function useControlsContext(): ControlsContextValue | undefined {
  return useContext(ControlsContext);
}
