'use client';

import type { SliderInput, SliderState } from '@videojs/core';
import {
  createSlider,
  type SliderApi,
  type SliderOptions,
  type SliderRootProps,
  type SliderRootStyle,
  type SliderThumbProps,
} from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import { isRTL } from '@videojs/utils/dom';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useDestroy } from '../../utils/use-destroy';
import { useForceRender } from '../../utils/use-force-render';
import { useLatestRef } from '../../utils/use-latest-ref';

export interface UseSliderOptions<State extends SliderState = SliderState>
  extends Pick<
    SliderOptions,
    | 'getPercent'
    | 'getStepPercent'
    | 'getLargeStepPercent'
    | 'changeThrottle'
    | 'onValueChange'
    | 'onValueCommit'
    | 'onDragStart'
    | 'onDragEnd'
  > {
  computeState: (input: SliderInput) => State;
  orientation?: 'horizontal' | 'vertical' | undefined;
  disabled?: boolean | undefined;
  /** Adjust a raw 0–100 percent for thumb alignment. Called for fill and pointer percents. */
  adjustPercent?: ((rawPercent: number, thumbSize: number, trackSize: number) => number) | undefined;
  /** Compute CSS variable map from the (possibly alignment-adjusted) state. */
  getCSSVars: (state: State) => Record<string, string>;
}

export interface UseSliderReturnValue<State extends SliderState = SliderState> {
  state: State;
  cssVars: Record<string, string>;
  rootRef: React.RefCallback<HTMLElement>;
  thumbRef: React.RefCallback<HTMLElement>;
  rootProps: SliderRootProps;
  rootStyle: SliderRootStyle;
  thumbProps: SliderThumbProps;
}

/**
 * Manages slider input lifecycle for React.
 *
 * Wraps `createSlider()` from `@videojs/core/dom` and subscribes to its
 * input state via `useSnapshot`. Returns split props for the root
 * (pointer events) and thumb (keyboard/focus) elements.
 */
export function useSlider<State extends SliderState = SliderState>(
  options: UseSliderOptions<State>
): UseSliderReturnValue<State> {
  const optionsRef = useLatestRef(options);

  const rootElementRef = useRef<HTMLElement | null>(null);
  const thumbElementRef = useRef<HTMLElement | null>(null);
  const forceRender = useForceRender();

  // Lazy-init the slider handle. Stable across re-renders.
  const [slider] = useState<SliderApi>(() => {
    const stableOptions: SliderOptions = {
      getElement: () => rootElementRef.current!,
      getThumbElement: () => thumbElementRef.current,
      getOrientation: () => optionsRef.current.orientation ?? 'horizontal',
      isRTL: () => (rootElementRef.current ? isRTL(rootElementRef.current) : false),
      isDisabled: () => optionsRef.current.disabled ?? false,
      getPercent: () => optionsRef.current.getPercent(),
      getStepPercent: () => optionsRef.current.getStepPercent(),
      getLargeStepPercent: () => optionsRef.current.getLargeStepPercent(),
      changeThrottle: optionsRef.current.changeThrottle,
      adjustPercent: optionsRef.current.adjustPercent,
      onValueChange: (percent) => optionsRef.current.onValueChange?.(percent),
      onValueCommit: (percent) => optionsRef.current.onValueCommit?.(percent),
      onDragStart: () => optionsRef.current.onDragStart?.(),
      onDragEnd: () => optionsRef.current.onDragEnd?.(),
    };

    return createSlider(stableOptions);
  });

  useDestroy(slider);

  // Subscribe to slider input state.
  const input = useSnapshot(slider.input);

  // Compute derived state from input + caller-provided projection.
  const state = options.computeState(input);

  // Force a synchronous re-render after mount so edge thumb alignment
  // can read DOM measurements from the now-populated element refs.
  useLayoutEffect(() => {
    if (state.thumbAlignment === 'edge' && rootElementRef.current && thumbElementRef.current) {
      forceRender();
    }
  }, [state.thumbAlignment]);

  // Adjust CSS var percents for edge thumb alignment using live DOM measurements.
  const cssVars = options.getCSSVars(slider.adjustForAlignment(state));

  // Ref callbacks for root and thumb elements.
  const rootRef = useCallback((element: HTMLElement | null) => {
    rootElementRef.current = element;
  }, []);

  const thumbRef = useCallback((element: HTMLElement | null) => {
    thumbElementRef.current = element;
  }, []);

  return {
    state,
    cssVars,
    rootRef,
    thumbRef,
    rootProps: slider.rootProps,
    rootStyle: slider.rootStyle,
    thumbProps: slider.thumbProps,
  };
}

export namespace useSlider {
  export type Options = UseSliderOptions;
  export type ReturnValue = UseSliderReturnValue;
}
