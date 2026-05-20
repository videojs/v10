import { createState } from '@videojs/store';

import type { IndicatorCoreProps, IndicatorLifecycleState } from './indicator-lifecycle';
import { getIndicatorCloseDelay, IndicatorCloseController } from './indicator-lifecycle';
import {
  formatCurrentTime,
  getSeekDirection,
  type IndicatorDirection,
  type InputActionEvent,
  isSeekIndicatorAction,
  type MediaSnapshot,
} from './status';

/** Props for the seek indicator core. */
export interface SeekIndicatorProps extends IndicatorCoreProps {}

/** Reactive state surfaced by the seek indicator core. */
export interface SeekIndicatorState extends IndicatorLifecycleState {
  /** Direction of the latest seek, or null when no seek is active. */
  direction: IndicatorDirection | null;
  /** Number of consecutive same-direction seek-step actions in the current burst. */
  count: number;
  /** Total seek offset accumulated during the current burst, in seconds. */
  seekTotal: number;
  /** Display string for the current burst total (e.g. `"30s"`), or null when not a seek-step burst. */
  value: string | null;
  /** Formatted current playback time at the start of the burst. */
  currentTime: string;
}

const INITIAL_STATE: SeekIndicatorState = {
  open: false,
  generation: 0,
  direction: null,
  count: 0,
  seekTotal: 0,
  value: null,
  currentTime: '0:00',
  transitionStarting: false,
  transitionEnding: false,
};

/** Behavior core for the seek feedback indicator — accumulates seek-step bursts. */
export class SeekIndicatorCore {
  /** Reactive state container. */
  readonly state = createState<SeekIndicatorState>({ ...INITIAL_STATE });

  #props: SeekIndicatorProps = {};
  #originTime: number | null = null;
  #close = new IndicatorCloseController(
    () => {
      this.#originTime = null;
      this.state.patch({
        open: false,
        direction: null,
        count: 0,
        seekTotal: 0,
        value: null,
      });
    },
    () => getIndicatorCloseDelay(this.#props)
  );

  /** Update props on the core. */
  setProps(props: SeekIndicatorProps): void {
    this.#props = props;
  }

  /** Cancel any pending close timer. */
  destroy(): void {
    this.#close.destroy();
  }

  /** Close the indicator immediately and reset accumulated burst state. */
  close(): void {
    this.#close.close();
  }

  /** Process an input-action event; returns `true` if the indicator handled it. */
  processEvent(event: InputActionEvent, snapshot: MediaSnapshot): boolean {
    if (!isSeekIndicatorAction(event.action)) return false;

    const current = this.state.current;
    const direction = getSeekDirection(event, snapshot);
    const rapidRepeat = current.open && event.action === 'seekStep' && current.direction === direction;

    if (!rapidRepeat) {
      this.#originTime = snapshot.currentTime ?? null;
    }

    const value = this.#getEffectiveSeekValue(event, snapshot, rapidRepeat);
    const seekTotal = rapidRepeat ? current.seekTotal + Math.abs(value) : Math.abs(value);

    this.state.patch({
      open: true,
      generation: current.generation + 1,
      direction,
      count: rapidRepeat ? current.count + 1 : 1,
      seekTotal,
      value: event.action === 'seekStep' && seekTotal > 0 ? `${seekTotal}s` : null,
      currentTime: formatCurrentTime(snapshot),
    });
    this.#close.arm();
    return true;
  }

  #getEffectiveSeekValue(event: InputActionEvent, snapshot: MediaSnapshot, rapidRepeat: boolean): number {
    if (event.action !== 'seekStep' || event.value === undefined) return 0;
    if (!rapidRepeat || this.#originTime === null) return event.value;

    const originTime = this.#originTime;
    const duration = snapshot.duration ?? Infinity;
    const currentTotal = this.state.current.seekTotal;
    const step = Math.abs(event.value);
    const room =
      event.value < 0 ? Math.max(0, originTime - currentTotal) : Math.max(0, duration - originTime - currentTotal);

    return room >= step ? event.value : 0;
  }
}

export namespace SeekIndicatorCore {
  /** Alias for {@link SeekIndicatorProps}. */
  export type Props = SeekIndicatorProps;
  /** Alias for {@link SeekIndicatorState}. */
  export type State = SeekIndicatorState;
}
