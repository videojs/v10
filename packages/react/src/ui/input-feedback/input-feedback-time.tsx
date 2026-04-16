'use client';

import type { InputFeedbackItemDataState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useInputFeedbackItemContext } from './context';

export interface InputFeedbackTimeProps extends UIComponentProps<'div', InputFeedbackItemDataState> {}

export const InputFeedbackTime = forwardRef(function InputFeedbackTime(
  componentProps: InputFeedbackTimeProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const { state } = useInputFeedbackItemContext();
  const text = state.value ?? '';

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      ref: forwardedRef,
      props: [{ children: text }, elementProps],
    }
  );
});

export namespace InputFeedbackTime {
  export type Props = InputFeedbackTimeProps;
}
