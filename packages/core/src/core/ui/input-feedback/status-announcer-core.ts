import { createState } from '@videojs/store';

import type { IndicatorCoreProps } from './indicator-lifecycle';
import { getIndicatorCloseDelay, IndicatorCloseController } from './indicator-lifecycle';
import {
  DEFAULT_INPUT_INDICATOR_LABELS,
  deriveAnnouncerLabel,
  type InputActionEvent,
  type InputIndicatorLabels,
  type MediaSnapshot,
} from './status';

export interface StatusAnnouncerProps extends IndicatorCoreProps {
  labels?: Partial<InputIndicatorLabels> | undefined;
}

export interface StatusAnnouncerState {
  label: string | null;
}

export class StatusAnnouncerCore {
  readonly state = createState<StatusAnnouncerState>({ label: null });

  #props: StatusAnnouncerProps = {};
  #close = new IndicatorCloseController(
    () => this.state.patch({ label: null }),
    () => getIndicatorCloseDelay(this.#props)
  );

  setProps(props: StatusAnnouncerProps): void {
    this.#props = props;
  }

  destroy(): void {
    this.#close.destroy();
  }

  processEvent(event: InputActionEvent, snapshot: MediaSnapshot): boolean {
    const label = deriveAnnouncerLabel(event, snapshot, {
      ...DEFAULT_INPUT_INDICATOR_LABELS,
      ...this.#props.labels,
    });
    if (!label) return false;

    this.state.patch({ label });
    this.#close.arm();
    return true;
  }
}

export namespace StatusAnnouncerCore {
  export type Props = StatusAnnouncerProps;
  export type State = StatusAnnouncerState;
}
