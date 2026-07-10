'use client';

import type { AlertDialogCore } from '@videojs/core';
import { resolveErrorDialogDescription } from '@videojs/core';
import { resolveTranslation } from '@videojs/core/i18n';
import { forwardRef, type ReactNode } from 'react';
import { useTranslator } from '../../i18n/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useAlertDialogContext } from '../alert-dialog/context';
import { useErrorDialogContext } from './context';

export interface ErrorDialogDescriptionProps extends UIComponentProps<'p', AlertDialogCore.State> {}

export const ErrorDialogDescription = forwardRef<HTMLParagraphElement, ErrorDialogDescriptionProps>(
  function ErrorDialogDescription({ render, className, style, children, ...elementProps }, forwardedRef) {
    const t = useTranslator();
    const { state, stateAttrMap } = useAlertDialogContext();
    const { lastError } = useErrorDialogContext();
    const description = resolveErrorDialogDescription(lastError);
    const content: ReactNode = children ?? resolveTranslation(t, description);

    return renderElement(
      'p',
      { render, className, style },
      {
        state,
        stateAttrMap,
        ref: forwardedRef,
        props: [{ id: state.descriptionId, children: content }, elementProps],
      }
    );
  }
);

export namespace ErrorDialogDescription {
  export type Props = ErrorDialogDescriptionProps;
  export type State = AlertDialogCore.State;
}
