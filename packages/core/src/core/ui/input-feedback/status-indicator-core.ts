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

export interface StatusIndicatorProps extends IndicatorCoreProps {
  actions?: readonly InputAction[] | undefined;
  labels?: Partial<InputIndicatorLabels> | undefined;
}

export interface StatusIndicatorState extends IndicatorLifecycleState {
  status: ReturnType<typeof deriveStatus> extends infer Details
    ? Details extends { status: infer Status }
      ? Status | null
      : never
    : never;
  label: string | null;
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

export class StatusIndicatorCore {
  readonly state = createState<StatusIndicatorState>({ ...INITIAL_STATE });

  #props: StatusIndicatorProps = {};
  #close = new IndicatorCloseController(
    () => this.state.patch({ open: false, status: null, label: null, value: null }),
    () => getIndicatorCloseDelay(this.#props)
  );

  setProps(props: StatusIndicatorProps): void {
    this.#props = props;
  }

  destroy(): void {
    this.#close.destroy();
  }

  close(): void {
    this.#close.close();
  }

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
  export type Props = StatusIndicatorProps;
  export type State = StatusIndicatorState;
}
