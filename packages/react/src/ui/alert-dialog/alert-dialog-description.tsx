'use client';

import type { AlertDialogCore } from '@videojs/core';

import type { UIComponentProps } from '../../utils/types';
import { createContextPart } from '../create-context-part';
import { useAlertDialogContext } from './context';

export interface AlertDialogDescriptionProps extends UIComponentProps<'p', AlertDialogCore.State> {}

export const AlertDialogDescription = createContextPart<AlertDialogDescriptionProps, AlertDialogCore.State>({
  displayName: 'AlertDialogDescription',
  tag: 'p',
  useContext: useAlertDialogContext,
  getProps: (state) => ({ id: state.descriptionId }),
});

export namespace AlertDialogDescription {
  export type Props = AlertDialogDescriptionProps;
  export type State = AlertDialogCore.State;
}
