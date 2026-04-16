'use client';

import type { InputFeedbackItemDataState, StateAttrMap } from '@videojs/core';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useInputFeedbackItemContext } from './context';

const InputFeedbackIconDataAttrs = {} as const satisfies StateAttrMap<InputFeedbackItemDataState>;

export interface InputFeedbackIconProps extends UIComponentProps<'span', InputFeedbackItemDataState> {
  children?: ReactNode | undefined;
}

export const InputFeedbackIcon = forwardRef(function InputFeedbackIcon(
  componentProps: InputFeedbackIconProps,
  forwardedRef: ForwardedRef<HTMLSpanElement>
) {
  const { render, className, style, children, ...elementProps } = componentProps;
  const { state } = useInputFeedbackItemContext();

  return renderElement(
    'span',
    { render, className, style },
    {
      state,
      stateAttrMap: InputFeedbackIconDataAttrs,
      ref: forwardedRef,
      props: [{ children, key: state.generation, style: { display: 'contents' } }, elementProps],
    }
  );
});

export namespace InputFeedbackIcon {
  export type Props = InputFeedbackIconProps;
}
