import type { SliderInput, SliderState } from '@videojs/core';
import { SliderCSSVars } from '@videojs/core';
import {
  createSlider,
  type SliderApi,
  type SliderOptions,
  type SliderRootProps,
  type SliderRootStyle,
  type SliderThumbProps,
  selectControls,
} from '@videojs/core/dom';
import type { State as StoreState } from '@videojs/store';
import { useSnapshot } from '@videojs/store/react';
import { observeResize } from '@videojs/utils/dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalPlayer } from '../../player/context';
import { useCommittedRef } from '../../utils/use-committed-ref';
import { useDestroy } from '../../utils/use-destroy';
import { useIsomorphicLayoutEffect } from '../../utils/use-isomorphic-layout-effect';

/** Discrete slider interaction fields observed by React. */
export type SliderInteractionState = Pick<SliderInput, 'dragging' | 'pointing' | 'focused'>;

/** High-frequency slider positions available through `useSliderMotion`. */
export type SliderMotionState = Pick<SliderInput, 'pointerPercent' | 'dragPercent'>;

/** Slider state exposed to React render callbacks, excluding high-frequency pointer position. */
export type SliderRenderState<State extends SliderState = SliderState> = Omit<State, keyof SliderMotionState>;

/** Options for projecting a core slider onto React render and motion channels. */
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
  /** Compute semantic render state from the discrete interaction fields React observes. */
  computeState: (interaction: SliderInteractionState) => State;
  orientation?: 'horizontal' | 'vertical' | undefined;
  disabled?: boolean | undefined;
  thumbAlignment?: 'center' | 'edge' | undefined;
  /** Adjust a raw 0–100 percent for thumb alignment. Called for fill and pointer percents. */
  adjustPercent?: ((rawPercent: number, thumbSize: number, trackSize: number) => number) | undefined;
  /** Compute CSS variable map from the (possibly alignment-adjusted) state. */
  getCSSVars: (state: State) => Record<string, string>;
}

/** Semantic state, motion state, and element bindings returned by `useSlider`. */
export interface UseSliderReturnValue<State extends SliderState = SliderState> {
  /** Semantic state safe to consume during render. */
  state: SliderRenderState<State>;
  /** High-frequency position source. Prefer `useSliderMotion` inside slider parts. */
  motion: StoreState<SliderMotionState>;
  /** React-owned CSS custom properties. Pointer motion is bound separately after commit. */
  cssVars: Record<string, string>;
  rootRef: React.RefCallback<HTMLElement>;
  thumbRef: React.RefCallback<HTMLElement>;
  rootProps: SliderRootProps;
  rootStyle: SliderRootStyle;
  thumbProps: SliderThumbProps;
}

interface SliderLayout {
  rootWidth: number;
  rootHeight: number;
  thumbWidth: number;
  thumbHeight: number;
}

const emptyLayout: SliderLayout = {
  rootWidth: 0,
  rootHeight: 0,
  thumbWidth: 0,
  thumbHeight: 0,
};

function isSameLayout(a: SliderLayout, b: SliderLayout): boolean {
  return (
    a.rootWidth === b.rootWidth &&
    a.rootHeight === b.rootHeight &&
    a.thumbWidth === b.thumbWidth &&
    a.thumbHeight === b.thumbHeight
  );
}

function getAlignmentSizes(layout: SliderLayout, orientation: SliderState['orientation']) {
  return orientation === 'horizontal'
    ? { thumbSize: layout.thumbWidth, trackSize: layout.rootWidth }
    : { thumbSize: layout.thumbHeight, trackSize: layout.rootHeight };
}

function alignState<State extends SliderState>(
  state: State,
  layout: SliderLayout,
  adjustPercent: UseSliderOptions<State>['adjustPercent']
): State {
  if (!adjustPercent || state.thumbAlignment !== 'edge') return state;

  const { thumbSize, trackSize } = getAlignmentSizes(layout, state.orientation);
  if (trackSize === 0) return state;

  return {
    ...state,
    fillPercent: adjustPercent(state.fillPercent, thumbSize, trackSize),
    pointerPercent: adjustPercent(state.pointerPercent, thumbSize, trackSize),
  };
}

/**
 * Manages slider input lifecycle for React.
 *
 * Wraps `createSlider()` from `@videojs/core/dom` and subscribes to its
 * discrete input state via `useSnapshot`. Pointer positions remain on a
 * separate motion channel so ordinary render callbacks do not re-render for
 * every pointer move.
 *
 * @param options - Slider state projection, event callbacks, and value mapping.
 */
export function useSlider<State extends SliderState = SliderState>(
  options: UseSliderOptions<State>
): UseSliderReturnValue<State> {
  const controls = useOptionalPlayer(selectControls);
  const requestControlsLock = controls?.requestControlsLock;
  const committedRef = useCommittedRef({ options, requestControlsLock });
  const releaseControlsLockRef = useRef<(() => void) | null>(null);

  const releaseControlsLock = useCallback(() => {
    releaseControlsLockRef.current?.();
    releaseControlsLockRef.current = null;
  }, []);

  useEffect(() => releaseControlsLock, [releaseControlsLock]);

  const rootElementRef = useRef<HTMLElement | null>(null);
  const thumbElementRef = useRef<HTMLElement | null>(null);
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
  const [thumbElement, setThumbElement] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<SliderLayout>(emptyLayout);

  // Lazy-init the slider handle. Stable across re-renders.
  const [slider] = useState<SliderApi>(() => {
    const stableOptions: SliderOptions = {
      getElement: () => rootElementRef.current!,
      getThumbElement: () => thumbElementRef.current,
      getOrientation: () => committedRef.current.options.orientation ?? 'horizontal',
      isDisabled: () => committedRef.current.options.disabled ?? false,
      getPercent: () => committedRef.current.options.getPercent(),
      getStepPercent: () => committedRef.current.options.getStepPercent(),
      getLargeStepPercent: () => committedRef.current.options.getLargeStepPercent(),
      changeThrottle: committedRef.current.options.changeThrottle,
      onValueChange: (percent) => committedRef.current.options.onValueChange?.(percent),
      onValueCommit: (percent) => committedRef.current.options.onValueCommit?.(percent),
      onDragStart: () => {
        releaseControlsLockRef.current ??= committedRef.current.requestControlsLock?.() ?? null;
        committedRef.current.options.onDragStart?.();
      },
      onDragEnd: () => {
        releaseControlsLock();
        committedRef.current.options.onDragEnd?.();
      },
    };

    return createSlider(stableOptions);
  });

  useDestroy(slider);

  const interaction = useSnapshot(
    slider.input,
    ({ dragging, pointing, focused }): SliderInteractionState => ({
      dragging,
      pointing,
      focused,
    })
  );
  const fullState = options.computeState(interaction);
  const alignedState = alignState(fullState, layout, options.adjustPercent);
  const { [SliderCSSVars.pointer]: _pointerCSSVar, ...cssVars } = options.getCSSVars(alignedState);
  const { pointerPercent: _pointerPercent, ...renderState } = fullState;
  const state = renderState as SliderRenderState<State>;
  const motion = slider.input as StoreState<SliderMotionState>;

  const measureAlignment = useCallback(() => {
    const root = rootElementRef.current;
    const thumb = thumbElementRef.current;
    if (!root || !thumb) return;

    const next = {
      rootWidth: root.offsetWidth,
      rootHeight: root.offsetHeight,
      thumbWidth: thumb.offsetWidth,
      thumbHeight: thumb.offsetHeight,
    };
    setLayout((current) => (isSameLayout(current, next) ? current : next));
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (fullState.thumbAlignment !== 'edge' || !rootElement || !thumbElement) return;

    // Establish initial geometry after commit, then keep it current without
    // coupling future measurements to React renders.
    measureAlignment();
    return observeResize([rootElement, thumbElement], measureAlignment);
  }, [fullState.thumbAlignment, measureAlignment, rootElement, thumbElement]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the retained callback reads insertion-committed options without changing identity
  const syncPointer = useCallback(
    (element = rootElementRef.current) => {
      if (!element) return;

      const current = committedRef.current.options;
      let pointerPercent = slider.input.current.pointerPercent;

      if (current.thumbAlignment === 'edge' && current.adjustPercent) {
        const orientation = current.orientation ?? 'horizontal';
        const { thumbSize, trackSize } = getAlignmentSizes(layout, orientation);
        if (trackSize > 0) pointerPercent = current.adjustPercent(pointerPercent, thumbSize, trackSize);
      }

      element.style.setProperty(SliderCSSVars.pointer, `${pointerPercent.toFixed(3)}%`);
    },
    [layout, slider]
  );

  useIsomorphicLayoutEffect(() => {
    syncPointer();
  });

  useIsomorphicLayoutEffect(() => {
    return slider.input.subscribe(syncPointer);
  }, [slider, syncPointer]);

  // Ref callbacks for root and thumb elements.
  const rootRef = useCallback(
    (element: HTMLElement | null) => {
      rootElementRef.current = element;
      setRootElement(element);
      syncPointer(element);
    },
    [syncPointer]
  );

  const thumbRef = useCallback((element: HTMLElement | null) => {
    thumbElementRef.current = element;
    setThumbElement(element);
  }, []);

  return {
    state,
    motion,
    cssVars,
    rootRef,
    thumbRef,
    rootProps: slider.rootProps,
    rootStyle: slider.rootStyle,
    thumbProps: slider.thumbProps,
  };
}

export namespace useSlider {
  export type Options<State extends SliderState = SliderState> = UseSliderOptions<State>;
  export type ReturnValue<State extends SliderState = SliderState> = UseSliderReturnValue<State>;
}
