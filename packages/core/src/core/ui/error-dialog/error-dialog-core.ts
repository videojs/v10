import { AlertDialogCore, type AlertDialogState } from '../alert-dialog/alert-dialog-core';
import type { ErrorDialogProps } from './props';

export interface ErrorDialogState extends AlertDialogState {}

/** Error-dialog core: an alert dialog whose open state is driven by media error state. */
export class ErrorDialogCore extends AlertDialogCore {
  override setProps(): void {}
}

export namespace ErrorDialogCore {
  export type Props = ErrorDialogProps;
  export type State = ErrorDialogState;
}
