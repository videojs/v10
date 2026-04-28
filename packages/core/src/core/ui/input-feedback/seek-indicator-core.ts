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

export interface SeekIndicatorProps extends IndicatorCoreProps {}

export interface SeekIndicatorState extends IndicatorLifecycleState {
  direction: IndicatorDirection | null;
  count: number;
  seekTotal: number;
  value: string | null;
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

export class SeekIndicatorCore {
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

  setProps(props: SeekIndicatorProps): void {
    this.#props = props;
  }

  destroy(): void {
    this.#close.destroy();
  }

  close(): void {
    this.#close.close();
  }

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
  export type Props = SeekIndicatorProps;
  export type State = SeekIndicatorState;
}
