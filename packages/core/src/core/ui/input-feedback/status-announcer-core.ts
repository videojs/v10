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

/** Props for the status announcer core. */
export interface StatusAnnouncerProps extends IndicatorCoreProps {
  /** Override the default label strings used in announcer text. */
  labels?: Partial<InputIndicatorLabels> | undefined;
}

/** Reactive state surfaced by the status announcer core. */
export interface StatusAnnouncerState {
  /** Current label to announce to assistive tech, or null when idle. */
  label: string | null;
}

/** Behavior core that drives an aria-live announcer in response to input actions. */
export class StatusAnnouncerCore {
  /** Reactive state container. */
  readonly state = createState<StatusAnnouncerState>({ label: null });

  #props: StatusAnnouncerProps = {};
  #close = new IndicatorCloseController(
    () => this.state.patch({ label: null }),
    () => getIndicatorCloseDelay(this.#props)
  );

  /** Update props on the core. */
  setProps(props: StatusAnnouncerProps): void {
    this.#props = props;
  }

  /** Cancel any pending clear timer. */
  destroy(): void {
    this.#close.destroy();
  }

  /** Process an input-action event; returns `true` if a label was announced. */
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
  /** Alias for {@link StatusAnnouncerProps}. */
  export type Props = StatusAnnouncerProps;
  /** Alias for {@link StatusAnnouncerState}. */
  export type State = StatusAnnouncerState;
}
