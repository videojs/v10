import type { NonNullableObject } from '@videojs/utils/types';

import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';

/** Props for the alert dialog core. */
export interface AlertDialogProps {
  /** Controlled open state. When set, the consumer is responsible for toggling. */
  open?: boolean | undefined;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean | undefined;
}

/** Raw transition state pushed into the alert dialog core. */
export interface AlertDialogInput extends TransitionState {}

/** Reactive state surfaced by the alert dialog core. */
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

/** Behavior core for the alert dialog — derives open state and ARIA wiring. */
export class AlertDialogCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<AlertDialogProps> = {
    open: false,
    defaultOpen: false,
  };

  /** Accept props for API consistency. Props are consumed by platform layers. */
  setProps(_props: AlertDialogProps): void {}

  #input: AlertDialogInput | null = null;
  #titleId: string | undefined = undefined;
  #descriptionId: string | undefined = undefined;

  /** Push transition input from the surrounding transition controller. */
  setInput(input: AlertDialogInput): void {
    this.#input = input;
  }

  /** Set the element ID used for `aria-labelledby`. */
  setTitleId(id: string | undefined): void {
    this.#titleId = id;
  }

  /** Set the element ID used for `aria-describedby`. */
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
  /** Alias for {@link AlertDialogProps}. */
  export type Props = AlertDialogProps;
  /** Alias for {@link AlertDialogState}. */
  export type State = AlertDialogState;
  /** Alias for {@link AlertDialogInput}. */
  export type Input = AlertDialogInput;
}
