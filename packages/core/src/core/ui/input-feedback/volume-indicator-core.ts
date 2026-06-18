import { createState } from '@videojs/store';

import type { IndicatorCoreProps, IndicatorLifecycleState } from './indicator-lifecycle';
import { getIndicatorCloseDelay, IndicatorCloseController } from './indicator-lifecycle';
import {
  DEFAULT_INPUT_INDICATOR_LABELS,
  deriveVolumeStatus,
  type IndicatorVolumeLevel,
  type InputActionEvent,
  isVolumeIndicatorAction,
  type MediaSnapshot,
  predictVolumeActionOutcome,
} from './status';

export interface VolumeIndicatorProps extends IndicatorCoreProps {}

export interface VolumeIndicatorState extends IndicatorLifecycleState {
  level: IndicatorVolumeLevel | null;
  value: string | null;
  fill: string | null;
  min: boolean;
  max: boolean;
}

const BOUNDARY_CLEAR_DELAY = 300;

const INITIAL_STATE: VolumeIndicatorState = {
  open: false,
  generation: 0,
  level: null,
  value: null,
  fill: null,
  min: false,
  max: false,
  transitionStarting: false,
  transitionEnding: false,
};

export class VolumeIndicatorCore {
  readonly state = createState<VolumeIndicatorState>({ ...INITIAL_STATE });

  #props: VolumeIndicatorProps = {};
  #boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  #boundaryRestartTimer: ReturnType<typeof setTimeout> | null = null;
  #close = new IndicatorCloseController(
    () => this.state.patch({ open: false, level: null, value: null, fill: null, min: false, max: false }),
    () => getIndicatorCloseDelay(this.#props)
  );

  setProps(props: VolumeIndicatorProps): void {
    this.#props = props;
  }

  destroy(): void {
    this.#close.destroy();
    this.#clearBoundaryTimers();
  }

  close(): void {
    this.#clearBoundaryTimers();
    this.#close.close();
  }

  processEvent(event: InputActionEvent, snapshot: MediaSnapshot): boolean {
    if (!isVolumeIndicatorAction(event.action)) return false;

    const current = this.state.current;
    const prediction = predictVolumeActionOutcome(event, snapshot);
    const details = deriveVolumeStatus(event, snapshot, DEFAULT_INPUT_INDICATOR_LABELS, prediction);
    const boundary = getVolumeBoundary(event, prediction.snapshotVolume, prediction.nextVolume);
    const repeatedBoundary = boundary !== null && current[boundary] === true;

    if (!boundary) this.#clearBoundaryTimers();

    this.state.patch({
      open: true,
      generation: current.generation + 1,
      level: details.volumeLevel,
      value: details.value,
      fill: details.value,
      min: boundary === 'min' && !repeatedBoundary,
      max: boundary === 'max' && !repeatedBoundary,
    });

    if (boundary) {
      if (repeatedBoundary) {
        this.#restartBoundary(boundary);
      } else {
        this.#scheduleBoundaryClear();
      }
    }

    this.#close.arm();
    return true;
  }

  #scheduleBoundaryClear(): void {
    this.#clearBoundaryTimer();
    this.#boundaryTimer = setTimeout(() => {
      this.#boundaryTimer = null;
      this.state.patch({ min: false, max: false });
    }, BOUNDARY_CLEAR_DELAY);
  }

  #restartBoundary(boundary: 'min' | 'max'): void {
    this.#clearBoundaryTimers();
    this.state.patch({ min: false, max: false });
    this.#boundaryRestartTimer = setTimeout(() => {
      this.#boundaryRestartTimer = null;
      this.state.patch({ [boundary]: true });
      this.#scheduleBoundaryClear();
    }, 0);
  }

  #clearBoundaryTimer(): void {
    if (this.#boundaryTimer === null) return;
    clearTimeout(this.#boundaryTimer);
    this.#boundaryTimer = null;
  }

  #clearBoundaryRestartTimer(): void {
    if (this.#boundaryRestartTimer === null) return;
    clearTimeout(this.#boundaryRestartTimer);
    this.#boundaryRestartTimer = null;
  }

  #clearBoundaryTimers(): void {
    this.#clearBoundaryTimer();
    this.#clearBoundaryRestartTimer();
  }
}

export namespace VolumeIndicatorCore {
  export type Props = VolumeIndicatorProps;
  export type State = VolumeIndicatorState;
}

function getVolumeBoundary(event: InputActionEvent, currentVolume: number, nextVolume: number): 'min' | 'max' | null {
  if (event.action !== 'volumeStep' || event.value === undefined || event.value === 0) return null;
  if (nextVolume !== currentVolume) return null;
  return event.value < 0 ? 'min' : 'max';
}
