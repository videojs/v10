import { createState } from '@videojs/store';

import type { IndicatorCoreProps, IndicatorLifecycleState } from './indicator-lifecycle';
import { getIndicatorCloseDelay, IndicatorCloseController } from './indicator-lifecycle';
import {
  DEFAULT_INPUT_INDICATOR_LABELS,
  deriveStatus,
  type InputAction,
  type InputActionEvent,
  type InputIndicatorLabels,
  isInputActionIncluded,
  type MediaSnapshot,
} from './status';

/** Props for the status indicator core. */
export interface StatusIndicatorProps extends IndicatorCoreProps {
  /** Input actions this indicator should respond to. Omit to handle all. */
  actions?: readonly InputAction[] | undefined;
  /** Override the default label strings used in status text. */
  labels?: Partial<InputIndicatorLabels> | undefined;
}

/** Reactive state surfaced by the status indicator core. */
export interface StatusIndicatorState extends IndicatorLifecycleState {
  /** Status key for the last action handled, or null when idle. */
  status: ReturnType<typeof deriveStatus> extends infer Details
    ? Details extends { status: infer Status }
      ? Status | null
      : never
    : never;
  /** Human-readable label for the current status, or null when idle. */
  label: string | null;
  /** Optional value string (e.g. a playback rate or volume percent). */
  value: string | null;
}

const INITIAL_STATE: StatusIndicatorState = {
  open: false,
  generation: 0,
  status: null,
  label: null,
  value: null,
  transitionStarting: false,
  transitionEnding: false,
};

/** Behavior core for the generic status indicator — surfaces label and value for handled actions. */
export class StatusIndicatorCore {
  /** Reactive state container. */
  readonly state = createState<StatusIndicatorState>({ ...INITIAL_STATE });

  #props: StatusIndicatorProps = {};
  #close = new IndicatorCloseController(
    () => this.state.patch({ open: false, status: null, label: null, value: null }),
    () => getIndicatorCloseDelay(this.#props)
  );

  setProps(props: StatusIndicatorProps): void {
    this.#props = props;
  }

  /** Cancel any pending close timer. */
  destroy(): void {
    this.#close.destroy();
  }

  /** Close the indicator immediately. */
  close(): void {
    this.#close.close();
  }

  /** Process an input-action event; returns `true` if the indicator handled it. */
  processEvent(event: InputActionEvent, snapshot: MediaSnapshot): boolean {
    if (!isInputActionIncluded(event.action, this.#props.actions)) return false;

    const details = deriveStatus(event, snapshot, {
      ...DEFAULT_INPUT_INDICATOR_LABELS,
      ...this.#props.labels,
    });
    if (!details) return false;

    this.state.patch({
      open: true,
      generation: this.state.current.generation + 1,
      status: details.status,
      label: details.label,
      value: details.value,
    });
    this.#close.arm();
    return true;
  }
}

export namespace StatusIndicatorCore {
  /** Alias for {@link StatusIndicatorProps}. */
  export type Props = StatusIndicatorProps;
  /** Alias for {@link StatusIndicatorState}. */
  export type State = StatusIndicatorState;
}
