import { DialogCore, type DialogInput, type DialogProps, type DialogState } from '../dialog/dialog-core';

export interface AlertDialogProps extends DialogProps {}
export interface AlertDialogInput extends DialogInput {}
export interface AlertDialogState extends DialogState {}

/** A dialog with alert semantics for urgent messages that require acknowledgement. */
export class AlertDialogCore extends DialogCore {
  constructor() {
    super('alertdialog');
  }

  /** @deprecated Use `getPopupAttrs`. */
  getAttrs(state: AlertDialogState) {
    return this.getPopupAttrs(state);
  }
}

export namespace AlertDialogCore {
  export type Props = AlertDialogProps;
  export type State = AlertDialogState;
  export type Input = AlertDialogInput;
}
