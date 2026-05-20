import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';

/** Side of the trigger a popover anchors to. */
export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

/** Alignment of the popover along the trigger's anchor edge. */
export type PopoverAlign = 'start' | 'center' | 'end';

/** Props for the popover core. */
export interface PopoverProps {
  /** Which side of the trigger the popup appears on. */
  side?: PopoverSide | undefined;
  /** Alignment of the popup along the trigger's edge. */
  align?: PopoverAlign | undefined;
  /**
   * - `false` (default): non-modal; background content remains interactive.
   * - `true`: modal; sets `aria-modal="true"` on the popup.
   * - `'trap-focus'`: reserved for future focus-trapping behavior.
   */
  modal?: boolean | 'trap-focus' | undefined;
  /** Close the popup when the Escape key is pressed. */
  closeOnEscape?: boolean | undefined;
  /** Close the popup when clicking outside the trigger and popup. */
  closeOnOutsideClick?: boolean | undefined;
  /** Controlled open state. When set, the consumer is responsible for toggling. */
  open?: boolean | undefined;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean | undefined;
  /** Open the popup on pointer hover instead of click. */
  openOnHover?: boolean | undefined;
  /** Delay in ms before opening on hover. */
  delay?: number | undefined;
  /** Delay in ms before closing after pointer leaves. */
  closeDelay?: number | undefined;
}

/**
 * The raw transition state managed by `createTransition`. Uses `active`
 * (not `open`) to distinguish the generic transition state machine from the
 * domain-specific `PopoverState.open`.
 */
export interface PopoverInput extends TransitionState {}

/** Reactive state surfaced by the popover core. */
export interface PopoverState extends TransitionFlags {
  /** Whether the popover is currently open. */
  open: boolean;
  /** Current transition status of the popover's open/close animation. */
  status: TransitionStatus;
  /** Side of the trigger the popup appears on. */
  side: PopoverSide;
  /** Alignment along the trigger's edge. */
  align: PopoverAlign;
  /** Modality of the popup. */
  modal: boolean | 'trap-focus';
}

/** Behavior core for the popover — derives open state and ARIA attributes. */
export class PopoverCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<PopoverProps> = {
    side: 'top',
    align: 'center',
    modal: false,
    closeOnEscape: true,
    closeOnOutsideClick: true,
    open: false,
    defaultOpen: false,
    openOnHover: false,
    delay: 300,
    closeDelay: 0,
  };

  #props = { ...PopoverCore.defaultProps };

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: PopoverProps) {
    if (props) this.setProps(props);
  }

  /** Update props on the core. */
  setProps(props: PopoverProps): void {
    this.#props = defaults(props, PopoverCore.defaultProps);
  }

  #input: PopoverInput | null = null;

  /** Push transition input from the surrounding transition controller. */
  setInput(input: PopoverInput): void {
    this.#input = input;
  }

  /** Recompute and return the current state. */
  getState(): PopoverState {
    const input = this.#input!;
    return {
      open: input.active,
      status: input.status,
      side: this.#props.side,
      align: this.#props.align,
      modal: this.#props.modal,
      ...getTransitionFlags(input.status),
    };
  }

  /** Compute ARIA attributes for the popover trigger. */
  getTriggerAttrs(state: PopoverState, popupId?: string) {
    return {
      'aria-expanded': state.open ? 'true' : 'false',
      'aria-haspopup': 'dialog',
      'aria-controls': popupId,
    };
  }

  /** Compute ARIA and popover attributes for the popup element. */
  getPopupAttrs(state: PopoverState) {
    return {
      popover: 'manual' as const,
      role: 'dialog',
      'aria-modal': state.modal === true ? 'true' : undefined,
    };
  }
}

export namespace PopoverCore {
  /** Alias for {@link PopoverProps}. */
  export type Props = PopoverProps;
  /** Alias for {@link PopoverState}. */
  export type State = PopoverState;
  /** Alias for {@link PopoverInput}. */
  export type Input = PopoverInput;
}
