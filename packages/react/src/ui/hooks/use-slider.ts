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

export interface UseSliderOptions<State extends SliderState = SliderState> {
  computeState: (interaction: SliderInteraction) => State;
  getPercent: () => number;
  getStepPercent: () => number;
  getLargeStepPercent: () => number;
  orientation?: 'horizontal' | 'vertical' | undefined;
  disabled?: boolean | undefined;
  /** Trailing-edge throttle (ms) for `onValueCommit` during drag. Default `0` (disabled). */
  seekThrottle?: number | undefined;
  onValueChange?: ((percent: number) => void) | undefined;
  onValueCommit?: ((percent: number) => void) | undefined;
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
}

export interface UseSliderReturnValue<State extends SliderState = SliderState> {
  state: State;
  rootRef: React.RefCallback<HTMLElement>;
  thumbRef: React.RefCallback<HTMLElement>;
  /** Direct access to the root element for DOM measurement. */
  rootElement: React.RefObject<HTMLElement | null>;
  /** Direct access to the thumb element for DOM measurement. */
  thumbElement: React.RefObject<HTMLElement | null>;
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
      seekThrottle: optionsRef.current.seekThrottle,
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

  // Ref callbacks for root and thumb elements.
  const rootRef = useCallback((el: HTMLElement | null) => {
    rootElementRef.current = el;
  }, []);

  const thumbRef = useCallback((el: HTMLElement | null) => {
    thumbElementRef.current = el;
  }, []);

  return {
    state,
    rootRef,
    thumbRef,
    rootElement: rootElementRef,
    thumbElement: thumbElementRef,
    rootProps: slider.rootProps,
    thumbProps: slider.thumbProps,
  };
}

export namespace useSlider {
  export type Options = UseSliderOptions;
  export type ReturnValue = UseSliderReturnValue;
}
