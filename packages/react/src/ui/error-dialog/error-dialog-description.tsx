'use client';

import type { AlertDialogCore } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useAlertDialogContext } from '../alert-dialog/context';
import { useErrorDialogContext } from './context';

const FALLBACK_MESSAGE = 'An error occurred. Please try again.';

export interface ErrorDialogDescriptionProps extends UIComponentProps<'p', AlertDialogCore.State> {}

/** Description that defaults to the latest error message and falls back to a generic prompt. */
export const ErrorDialogDescription = forwardRef<HTMLParagraphElement, ErrorDialogDescriptionProps>(
  function ErrorDialogDescription({ render, className, style, children, ...elementProps }, forwardedRef) {
    const { state, stateAttrMap } = useAlertDialogContext();
    const { lastError } = useErrorDialogContext();

    return renderElement(
      'p',
      { render, className, style },
      {
        state,
        stateAttrMap,
        ref: forwardedRef,
        props: [
          { id: state.descriptionId, children: children ?? lastError?.message ?? FALLBACK_MESSAGE },
          elementProps,
        ],
      }
    );
  }
);

export namespace ErrorDialogDescription {
  export type Props = ErrorDialogDescriptionProps;
  export type State = AlertDialogCore.State;
}
