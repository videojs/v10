'use client';

import type { SliderInteraction, SliderState } from '@videojs/core';
import {
  createSlider,
  type SliderHandle,
  type SliderOptions,
  type SliderRootProps,
  type SliderThumbProps,
} from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import { isRTL } from '@videojs/utils/dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatestRef } from '../../utils/use-latest-ref';

export interface UseSliderOptions<State extends SliderState = SliderState>
  extends Pick<
    SliderOptions,
    | 'getPercent'
    | 'getStepPercent'
    | 'getLargeStepPercent'
    | 'commitThrottle'
    | 'onValueChange'
    | 'onValueCommit'
    | 'onDragStart'
    | 'onDragEnd'
  > {
  computeState: (interaction: SliderInteraction) => State;
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
  thumbProps: SliderThumbProps;
}

/**
 * Manages slider interaction lifecycle for React.
 *
 * Wraps `createSlider()` from `@videojs/core/dom` and subscribes to its
 * interaction state via `useSnapshot`. Returns split props for the root
 * (pointer events) and thumb (keyboard/focus) elements.
 */
export function useSlider<State extends SliderState = SliderState>(
  options: UseSliderOptions<State>
): UseSliderReturnValue<State> {
  const optionsRef = useLatestRef(options);

  const rootElementRef = useRef<HTMLElement | null>(null);
  const thumbElementRef = useRef<HTMLElement | null>(null);

  // Lazy-init the slider handle. Stable across re-renders.
  const [slider] = useState<SliderHandle>(() => {
    const stableOptions: SliderOptions = {
      getElement: () => rootElementRef.current!,
      getThumbElement: () => thumbElementRef.current,
      getOrientation: () => optionsRef.current.orientation ?? 'horizontal',
      isRTL: () => (rootElementRef.current ? isRTL(rootElementRef.current) : false),
      isDisabled: () => optionsRef.current.disabled ?? false,
      getPercent: () => optionsRef.current.getPercent(),
      getStepPercent: () => optionsRef.current.getStepPercent(),
      getLargeStepPercent: () => optionsRef.current.getLargeStepPercent(),
      commitThrottle: optionsRef.current.commitThrottle,
      onValueChange: (percent) => optionsRef.current.onValueChange?.(percent),
      onValueCommit: (percent) => optionsRef.current.onValueCommit?.(percent),
      onDragStart: () => optionsRef.current.onDragStart?.(),
      onDragEnd: () => optionsRef.current.onDragEnd?.(),
    };

    return createSlider(stableOptions);
  });

  // Cleanup on unmount.
  useEffect(() => () => slider.destroy(), [slider]);

  // Subscribe to interaction state.
  const interaction = useSnapshot(slider.interaction);

  // Compute derived state from interaction + caller-provided projection.
  const state = options.computeState(interaction);

  // Adjust CSS var percents for edge thumb alignment when DOM elements are available.
  const rootEl = rootElementRef.current;
  const thumbEl = thumbElementRef.current;
  let cssState = state;

  if (state.thumbAlignment === 'edge' && rootEl && thumbEl && options.adjustPercent) {
    const isHorizontal = state.orientation === 'horizontal';
    const thumbSize = isHorizontal ? thumbEl.offsetWidth : thumbEl.offsetHeight;
    const trackSize = isHorizontal ? rootEl.offsetWidth : rootEl.offsetHeight;
    cssState = {
      ...state,
      fillPercent: options.adjustPercent(state.fillPercent, thumbSize, trackSize),
      pointerPercent: options.adjustPercent(state.pointerPercent, thumbSize, trackSize),
    };
  }

  const cssVars = options.getCSSVars(cssState);

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
    thumbProps: slider.thumbProps,
  };
}

export namespace useSlider {
  export type Options = UseSliderOptions;
  export type ReturnValue = UseSliderReturnValue;
}
