import { AlertDialogCore, type AlertDialogState } from '../alert-dialog/alert-dialog-core';

/** Reactive state surfaced by the error dialog core. */
export interface ErrorDialogState extends AlertDialogState {}

/** Alert-dialog core that ignores props — open state is driven externally by media error state. */
export class ErrorDialogCore extends AlertDialogCore {
  /** No-op — the error dialog ignores props; open state comes from media error state. */
  override setProps(): void {}
}

export namespace ErrorDialogCore {
  /** Alias for {@link ErrorDialogState}. */
  export type State = ErrorDialogState;
}
