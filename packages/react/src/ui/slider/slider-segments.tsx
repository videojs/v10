'use client';

import {
  type SliderSegmentsProps as CoreProps,
  getSliderSegmentsId,
  SliderSegmentDataAttrs,
  SliderSegmentsCore,
  SliderSegmentsCSSVars,
  SliderSegmentsDataAttrs,
  type SliderState,
} from '@videojs/core';
import { getSliderTrackClipPath, getStateDataAttrs } from '@videojs/core/dom';
import { type CSSProperties, forwardRef, useLayoutEffect, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSliderContext } from './context';

export interface SliderSegmentsProps extends UIComponentProps<'svg', SliderState>, CoreProps {}

/** Renders ranges from the slider's value domain as an SVG clip path. */
export const SliderSegments = forwardRef<SVGSVGElement, SliderSegmentsProps>(
  function SliderSegments(componentProps, forwardedRef) {
    const { render, className, style, segments, ...elementProps } = componentProps;
    const context = useSliderContext();
    const [core] = useState(() => new SliderSegmentsCore());

    core.setProps({ segments });
    const state = core.getState(
      context.state.orientation,
      context.min,
      context.max,
      context.state.pointing ? context.pointerValue : undefined
    );
    const trackClipPath = state.hasSegments ? getSliderTrackClipPath(context.id) : undefined;

    useLayoutEffect(() => {
      context.setTrackClipPath(trackClipPath);
      return () => context.setTrackClipPath(undefined);
    }, [context.setTrackClipPath, trackClipPath]);

    if (!state.hasSegments) return null;

    const children = (
      <clipPath id={getSliderSegmentsId(context.id)} data-slot="slider-segments-clip-path">
        {state.segments.map((segment) => {
          const rectStyle = {
            [SliderSegmentsCSSVars.size]: `${segment.size}%`,
            [SliderSegmentsCSSVars.offset]: `${segment.offset}%`,
          } as CSSProperties;
          const rectAttrs = getStateDataAttrs(segment, SliderSegmentDataAttrs);

          return (
            <rect
              key={`${segment.offset}-${segment.size}`}
              data-slot="slider-segment"
              style={rectStyle}
              {...rectAttrs}
            />
          );
        })}
      </clipPath>
    );

    return renderElement(
      'svg',
      { render, className, style },
      {
        state: context.state,
        stateAttrMap: context.stateAttrMap,
        ref: forwardedRef,
        props: [core.getAttrs(state), getStateDataAttrs(state, SliderSegmentsDataAttrs), elementProps, { children }],
      }
    );
  }
);

export namespace SliderSegments {
  export type Props = SliderSegmentsProps;
  export type State = SliderState;
}
