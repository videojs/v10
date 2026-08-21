import type { StateAttrMap } from '@videojs/core';
import type { SliderThumbProps } from '@videojs/core/dom';
import type { State } from '@videojs/store';
import type { ProviderProps, RefCallback } from 'react';
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { SliderMotionState, SliderRenderState } from '../hooks/use-slider';

/** Live slider motion exposed to components that explicitly subscribe with `useSliderMotion`. */
export interface SliderMotionValue extends SliderMotionState {
  /** Pointer position converted from percent into the slider's value domain. */
  pointerValue: number;
}

export interface SliderContextValue {
  state: SliderRenderState;
  motion: State<SliderMotionState>;
  getPointerValue: (percent: number) => number;
  thumbRef: RefCallback<HTMLElement>;
  thumbProps: SliderThumbProps;
  stateAttrMap: StateAttrMap<SliderRenderState>;
  getAttrs: (state: SliderRenderState, pointer: Pick<SliderMotionValue, 'pointerPercent' | 'pointerValue'>) => object;
  formatValue?: ((value: number, type: 'current' | 'pointer') => string) | undefined;
}

const SliderContext = createContext<SliderContextValue | null>(null);

type SliderProviderProps = ProviderProps<SliderContextValue>;

export function SliderProvider({ value, children }: SliderProviderProps) {
  return <SliderContext.Provider value={value}>{children}</SliderContext.Provider>;
}

export function useSliderContext(): SliderContextValue {
  const ctx = useContext(SliderContext);
  if (!ctx) throw new Error('Slider compound components must be used within a Slider.Root');
  return ctx;
}

/**
 * Subscribe to high-frequency pointer and drag positions for a slider part.
 *
 * Ordinary slider render callbacks receive semantic state only. Use this hook
 * inside a `Slider.Root` when custom preview content must follow pointer motion.
 */
export function useSliderMotion(): SliderMotionValue {
  const context = useSliderContext();
  const subscribe = useCallback((onChange: () => void) => context.motion.subscribe(onChange), [context.motion]);
  const motion = useSyncExternalStore(
    subscribe,
    () => context.motion.current,
    () => context.motion.current
  );

  return {
    pointerPercent: motion.pointerPercent,
    dragPercent: motion.dragPercent,
    pointerValue: context.getPointerValue(motion.pointerPercent),
  };
}
