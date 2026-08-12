import type { NonNullableObject } from '@videojs/utils/types';

import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';

export interface AlertDialogProps {
  /** Controlled open state. When set, the consumer is responsible for toggling. */
  open?: boolean | undefined;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean | undefined;
}

export interface AlertDialogInput extends TransitionState {}

export interface AlertDialogState extends TransitionFlags {
  /** Whether the dialog is currently open. */
  open: boolean;
  /** Current phase of the transition lifecycle. */
  status: TransitionStatus;
  /** Element ID of the dialog title, used for `aria-labelledby`. */
  titleId: string | undefined;
  /** Element ID of the dialog description, used for `aria-describedby`. */
  descriptionId: string | undefined;
}

export class AlertDialogCore {
  static readonly defaultProps: NonNullableObject<AlertDialogProps> = {
    open: false,
    defaultOpen: false,
  };

  /** Accept props for API consistency. Props are consumed by platform layers. */
  setProps(_props: AlertDialogProps): void {}

  #input: AlertDialogInput | null = null;
  #titleId: string | undefined = undefined;
  #descriptionId: string | undefined = undefined;

  setInput(input: AlertDialogInput): void {
    this.#input = input;
  }

  setTitleId(id: string | undefined): void {
    this.#titleId = id;
  }

  setDescriptionId(id: string | undefined): void {
    this.#descriptionId = id;
  }

  getState(): AlertDialogState {
    const input = this.#input!;
    return {
      open: input.active,
      status: input.status,
      titleId: this.#titleId,
      descriptionId: this.#descriptionId,
      ...getTransitionFlags(input.status),
    };
  }

  getAttrs(state: AlertDialogState) {
    return {
      role: 'alertdialog' as const,
      'aria-modal': 'true' as const,
      'aria-labelledby': state.titleId,
      'aria-describedby': state.descriptionId,
    };
  }
}

export namespace AlertDialogCore {
  export type Props = AlertDialogProps;
  export type State = AlertDialogState;
  export type Input = AlertDialogInput;
}
