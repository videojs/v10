'use client';

import type { SliderState, StateAttrMap } from '@videojs/core';
import type { SliderThumbProps } from '@videojs/core/dom';
import type { RefCallback } from 'react';
import { createContext, useContext } from 'react';

export interface SliderContextValue {
  state: SliderState;
  /** Pointer position converted to the value domain (not 0–100 percent). */
  pointerValue: number;
  thumbRef: RefCallback<HTMLElement>;
  thumbProps: SliderThumbProps;
  stateAttrMap: StateAttrMap<SliderState>;
  getAttrs: (state: SliderState) => object;
  formatValue?: ((value: number, type: 'current' | 'pointer') => string) | undefined;
}

const SliderContext = createContext<SliderContextValue | undefined>(undefined);

export function SliderProvider({ value, children }: { value: SliderContextValue; children: React.ReactNode }) {
  return <SliderContext.Provider value={value}>{children}</SliderContext.Provider>;
}

export function useSliderContext(): SliderContextValue | undefined {
  return useContext(SliderContext);
}
