import type { SliderInput, SliderState } from '@videojs/core';
import {
  createSlider,
  type SliderApi,
  type SliderOptions,
  type SliderRootProps,
  type SliderRootStyle,
  type SliderThumbProps,
  selectControls,
} from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import { applyStyles } from '@videojs/utils/dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useOptionalPlayer } from '../../player/context';
import { useCommittedRef } from '../../utils/use-committed-ref';
import { useDestroy } from '../../utils/use-destroy';

export interface UseSliderOptions<State extends SliderState = SliderState> extends Pick<
  SliderOptions,
  | 'getPercent'
  | 'getStepPercent'
  | 'getLargeStepPercent'
  | 'changeThrottle'
  | 'onValueChange'
  | 'onValueCommit'
  | 'onPressStart'
  | 'onPressEnd'
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
  input: SliderApi['input'];
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
 * Wraps `createSlider()` from `@videojs/core/dom` and subscribes to its input state via `useSnapshot`. Returns split
 * props for the root (pointer events) and thumb (keyboard/focus) elements.
 */
export function useSlider<State extends SliderState = SliderState>(
  options: UseSliderOptions<State>
): UseSliderReturnValue<State> {
  // The retained slider reads options through this ref, so only committed renders reach its callbacks.
  const optionsRef = useCommittedRef(options);

  const controls = useOptionalPlayer(selectControls);
  const requestControlsLock = controls?.requestControlsLock;
  const releaseControlsLockRef = useRef<(() => void) | null>(null);

  const releaseControlsLock = useCallback(() => {
    releaseControlsLockRef.current?.();
    releaseControlsLockRef.current = null;
  }, []);

  useEffect(() => releaseControlsLock, [releaseControlsLock]);

  const rootElementRef = useRef<HTMLElement | null>(null);
  const thumbElementRef = useRef<HTMLElement | null>(null);

  // Lazy-init the slider handle. Stable across re-renders.
  const [slider] = useState<SliderApi>(() => {
    const stableOptions: SliderOptions = {
      getElement: () => rootElementRef.current!,
      getThumbElement: () => thumbElementRef.current,
      getOrientation: () => optionsRef.current.orientation ?? 'horizontal',
      isDisabled: () => optionsRef.current.disabled ?? false,
      getPercent: () => optionsRef.current.getPercent(),
      getStepPercent: () => optionsRef.current.getStepPercent(),
      getLargeStepPercent: () => optionsRef.current.getLargeStepPercent(),
      changeThrottle: optionsRef.current.changeThrottle,
      adjustPercent: optionsRef.current.adjustPercent
        ? (rawPercent, thumbSize, trackSize) =>
            optionsRef.current.adjustPercent?.(rawPercent, thumbSize, trackSize) ?? rawPercent
        : undefined,
      onValueChange: (percent) => optionsRef.current.onValueChange?.(percent),
      onValueCommit: (percent) => optionsRef.current.onValueCommit?.(percent),
      onPressStart: () => {
        releaseControlsLockRef.current ??= requestControlsLock?.() ?? null;
        optionsRef.current.onPressStart?.();
      },
      onPressEnd: () => {
        releaseControlsLock();
        optionsRef.current.onPressEnd?.();
      },
      onDragStart: () => optionsRef.current.onDragStart?.(),
      onDragEnd: () => optionsRef.current.onDragEnd?.(),
    };

    return createSlider(stableOptions);
  });

  useDestroy(slider);

  // Percentage changes are rendered directly below. React only needs to
  // re-render when interaction state changes.
  const interaction = useSnapshot(slider.input, ({ dragging, pointing, focused }) => ({
    dragging,
    pointing,
    focused,
  }));
  const input = { ...slider.input.current, ...interaction };

  // Compute derived state from input + caller-provided projection.
  const state = options.computeState(input);

  // Adjust CSS var percents for edge thumb alignment using live DOM measurements.
  const cssVars = options.getCSSVars(slider.adjustForAlignment(state));

  const syncStyles = useCallback(
    (element = rootElementRef.current) => {
      if (!element) return;

      const next = optionsRef.current.computeState(slider.input.current);

      applyStyles(element, optionsRef.current.getCSSVars(slider.adjustForAlignment(next)));
    },
    [slider]
  );

  useLayoutEffect(() => slider.input.subscribe(syncStyles), [slider, syncStyles]);

  // Edge alignment needs DOM measurements that only exist after commit, and the render above adjusted percents
  // through the previously committed options. Re-apply the committed CSS vars on mount and whenever alignment
  // changes so the DOM never keeps a stale adjustment.
  useLayoutEffect(() => {
    syncStyles();
  }, [syncStyles, state.thumbAlignment]);

  // Ref callbacks for root and thumb elements.
  const rootRef = useCallback(
    (element: HTMLElement | null) => {
      rootElementRef.current = element;
      syncStyles(element);
    },
    [syncStyles]
  );

  const thumbRef = useCallback((element: HTMLElement | null) => {
    thumbElementRef.current = element;
  }, []);

  return {
    state,
    input: slider.input,
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
