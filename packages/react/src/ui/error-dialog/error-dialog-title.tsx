'use client';

import type { AlertDialogCore } from '@videojs/core';
import { getErrorDialogTitleLabel } from '@videojs/core';
import { resolveTranslation } from '@videojs/core/i18n';
import { forwardRef, type ReactNode } from 'react';
import { useTranslator } from '../../i18n/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useAlertDialogContext } from '../alert-dialog/context';

export interface ErrorDialogTitleProps extends UIComponentProps<'h2', AlertDialogCore.State> {}

export const ErrorDialogTitle = forwardRef<HTMLHeadingElement, ErrorDialogTitleProps>(function ErrorDialogTitle(
  { render, className, style, children, ...elementProps },
  forwardedRef
) {
  const t = useTranslator();
  const { state, stateAttrMap } = useAlertDialogContext();
  const content: ReactNode = children ?? resolveTranslation(t, getErrorDialogTitleLabel());

  return renderElement(
    'h2',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: forwardedRef,
      props: [{ id: state.titleId, children: content }, elementProps],
    }
  );
});

export namespace ErrorDialogTitle {
  export type Props = ErrorDialogTitleProps;
  export type State = AlertDialogCore.State;
}
