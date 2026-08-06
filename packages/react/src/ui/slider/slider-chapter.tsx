'use client';

import { SliderChapterCore, type SliderState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { useTextTrack } from '../../player/use-text-track';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSliderContext } from './context';

export interface SliderChapterProps extends UIComponentProps<'span', SliderState> {}

/** Displays the chapter at the slider pointer position. */
export const SliderChapter = forwardRef(function SliderChapter(
  componentProps: SliderChapterProps,
  forwardedRef: ForwardedRef<HTMLSpanElement>
) {
  const { render, className, style, ...elementProps } = componentProps;
  const context = useSliderContext();
  const { pointerValue, state } = context;
  const cues = useTextTrack('chapters')?.cues ?? [];
  const [core] = useState(() => new SliderChapterCore());
  const chapter = core.getState(cues, pointerValue);

  return renderElement(
    'span',
    { render, className, style },
    {
      state,
      stateAttrMap: context.stateAttrMap,
      ref: forwardedRef,
      props: [{ children: chapter.title }, elementProps],
    }
  );
});

export namespace SliderChapter {
  export type Props = SliderChapterProps;
  export type State = SliderState;
}
