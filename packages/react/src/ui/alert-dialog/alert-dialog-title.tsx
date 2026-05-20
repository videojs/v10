'use client';

import type { AlertDialogCore } from '@videojs/core';

import type { UIComponentProps } from '../../utils/types';
import { createContextPart } from '../create-context-part';
import { useAlertDialogContext } from './context';

/** Props for the AlertDialog.Title component. */
export interface AlertDialogTitleProps extends UIComponentProps<'h2', AlertDialogCore.State> {}

/** Accessible title for the dialog, wired to the popup's `aria-labelledby`. */
export const AlertDialogTitle = createContextPart<AlertDialogTitleProps, AlertDialogCore.State>({
  displayName: 'AlertDialogTitle',
  tag: 'h2',
  useContext: useAlertDialogContext,
  getProps: (state) => ({ id: state.titleId }),
});

export namespace AlertDialogTitle {
  export type Props = AlertDialogTitleProps;
  export type State = AlertDialogCore.State;
}
