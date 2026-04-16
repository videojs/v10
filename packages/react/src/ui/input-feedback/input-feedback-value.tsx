'use client';

import { getInputFeedbackValueText, type InputFeedbackItemDataState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useInputFeedbackItemContext, useInputFeedbackRootContext } from './context';

export interface InputFeedbackValueProps extends UIComponentProps<'span', InputFeedbackItemDataState> {}

export const InputFeedbackValue = forwardRef(function InputFeedbackValue(
  componentProps: InputFeedbackValueProps,
  forwardedRef: ForwardedRef<HTMLSpanElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const { state } = useInputFeedbackItemContext();
  const { currentValues } = useInputFeedbackRootContext();
  const text = getInputFeedbackValueText(state, currentValues);

  return renderElement(
    'span',
    { render, className, style },
    {
      state,
      ref: forwardedRef,
      props: [{ children: text }, elementProps],
    }
  );
});

export namespace InputFeedbackValue {
  export type Props = InputFeedbackValueProps;
}
