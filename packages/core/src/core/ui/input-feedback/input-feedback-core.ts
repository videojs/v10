import { createState } from '@videojs/store';

/**
 * Minimal event shape accepted by `handleGesture` and `processEvent`.
 * Structurally compatible with `GestureActivateEvent` from `@videojs/core/dom`.
 */
export interface InputFeedbackEvent {
  type?: string | undefined;
  action?: string | undefined;
  value?: number | undefined;
  region?: string | undefined;
  /** Optional display text (e.g. "50%" for volumeStep). */
  label?: string | undefined;
}

/**
 * Media state snapshot passed to `processEvent` so the core can compute
 * expected post-action states without depending on the store directly.
 */
export interface InputFeedbackMediaState {
  paused?: boolean | undefined;
  volume?: number | undefined;
  muted?: boolean | undefined;
  fullscreen?: boolean | undefined;
  subtitlesShowing?: boolean | undefined;
  pip?: boolean | undefined;
  currentTime?: number | undefined;
  duration?: number | undefined;
}

export interface InputFeedbackState {
  active: boolean;
  /** The action that triggered the display. */
  action: string | null;
  /** The region where the gesture occurred. */
  region: string | null;
  /** Seek/volume direction derived from the value sign. */
  direction: 'forward' | 'backward' | null;
  /** Rapid-tap accumulation count. Resets when the display dismisses. */
  count: number;
  /** Accumulated absolute seek value (e.g. 20 after two +10s seeks). */
  seekTotal: number;
  /**
   * Increments on every gesture fire, including repeats.
   * The element layer watches this to restart CSS animations mid-display.
   */
  generation: number;
  /** Display text set by the caller (e.g. "50%" for volume). */
  label: string | null;
  /** Expected paused state after a togglePaused action. */
  paused: boolean | null;
  /** Expected volume level after a volume action. */
  volumeLevel: 'off' | 'low' | 'high' | null;
  /** Expected fullscreen state after a toggleFullscreen action. */
  fullscreen: boolean | null;
  /** Expected captions state after a toggleSubtitles action. */
  captions: boolean | null;
  /** Expected PiP state after a togglePictureInPicture action. */
  pip: boolean | null;
  /** Set to 'min' or 'max' when a volume step hits the floor/ceiling. Auto-clears after the shake animation duration. */
  boundary: 'min' | 'max' | null;
  /** Last volume label — persists through dismiss so text stays visible during fade-out. */
  volumeLabel: string | null;
  /** Last captions label — persists through dismiss so text stays visible during fade-out. */
  captionsLabel: string | null;
}

/** Maps volume (0–1) to a CSS-friendly level name for icon selection. */
export function volumeLevel(volume: number): 'off' | 'low' | 'high' {
  if (volume === 0) return 'off';
  return volume <= 0.5 ? 'low' : 'high';
}

const DISMISS_DELAY = 800;
const BOUNDARY_CLEAR_DELAY = 300;

const INITIAL_STATE: InputFeedbackState = {
  active: false,
  action: null,
  region: null,
  direction: null,
  count: 0,
  seekTotal: 0,
  generation: 0,
  label: null,
  paused: null,
  volumeLevel: null,
  fullscreen: null,
  captions: null,
  pip: null,
  boundary: null,
  volumeLabel: null,
  captionsLabel: null,
};

const DISMISS_STATE: Partial<InputFeedbackState> = {
  active: false,
  action: null,
  region: null,
  direction: null,
  count: 0,
  seekTotal: 0,
  label: null,
  paused: null,
  volumeLevel: null,
  fullscreen: null,
  captions: null,
  pip: null,
  boundary: null,
};

export class InputFeedbackCore {
  readonly state = createState<InputFeedbackState>({ ...INITIAL_STATE });

  labels: InputFeedbackLabels = { ...InputFeedbackCore.defaultLabels };

  #timer: ReturnType<typeof setTimeout> | null = null;
  #boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  #boundaryRestartTimer: ReturnType<typeof setTimeout> | null = null;
  #rippleOriginTime: number | null = null;

  destroy(): void {
    this.#clearTimer();
    this.#clearBoundaryTimers();
  }

  /**
   * High-level entry point that computes expected post-action states, labels,
   * boundary detection, and seek clamping from the media snapshot, then
   * delegates to `handleGesture`.
   */
  processEvent(event: InputFeedbackEvent, media: InputFeedbackMediaState): void {
    const current = this.state.current;
    const direction = event.value !== undefined ? (event.value >= 0 ? 'forward' : 'backward') : null;
    const isRapidRepeat =
      current.active &&
      current.action === (event.action ?? null) &&
      current.region === (event.region ?? null) &&
      (event.value === 0 || current.direction === direction);

    if (!isRapidRepeat && event.action === 'seekStep') {
      this.#rippleOriginTime = media.currentTime ?? null;
    }

    const adjusted = isRapidRepeat ? this.#clampSeekValue(event, media) : event;
    const { label, expectedStates } = this.#captureExpectedStates(event, media);
    const repeatedBoundary =
      expectedStates.boundary !== undefined &&
      expectedStates.boundary !== null &&
      current.boundary === expectedStates.boundary;

    this.handleGesture(label !== null ? { ...adjusted, label } : adjusted);
    this.state.patch(repeatedBoundary ? { ...expectedStates, boundary: null } : expectedStates);

    if (expectedStates.boundary !== undefined && expectedStates.boundary !== null) {
      if (repeatedBoundary) {
        this.#restartBoundary(expectedStates.boundary);
      } else {
        this.#scheduleBoundaryClear();
      }
    }
  }

  /** Low-level gesture handler — accumulates rapid taps and manages the dismiss timer. */
  handleGesture(event: InputFeedbackEvent): void {
    const current = this.state.current;
    const action = event.action ?? null;
    const region = event.region ?? null;
    const value = event.value;
    const label = event.label ?? null;

    const direction = value !== undefined ? (value >= 0 ? 'forward' : 'backward') : null;
    // value === 0 is direction-neutral (clamped no-op tap) — treat as same direction.
    const sameDirection = value === 0 || current.direction === direction;

    if (current.active && current.action === action && current.region === region && sameDirection) {
      // Rapid repeat: accumulate and restart animation.
      this.#clearTimer();
      this.state.patch({
        count: current.count + 1,
        seekTotal: current.seekTotal + (value !== undefined ? Math.abs(value) : 0),
        generation: current.generation + 1,
        label,
      });
    } else {
      // New gesture.
      this.#clearTimer();
      this.#clearBoundaryTimers();
      this.state.patch({
        active: true,
        action,
        region,
        direction,
        count: 1,
        seekTotal: value !== undefined ? Math.abs(value) : 0,
        generation: current.generation + 1,
        label,
        boundary: null,
      });
    }

    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.state.patch(DISMISS_STATE);
    }, DISMISS_DELAY);
  }

  #captureExpectedStates(
    event: InputFeedbackEvent,
    media: InputFeedbackMediaState
  ): {
    label: string | null;
    expectedStates: Partial<InputFeedbackState>;
  } {
    const states: Partial<InputFeedbackState> = {
      paused: null,
      volumeLevel: null,
      fullscreen: null,
      captions: null,
      pip: null,
    };

    let label: string | null = null;

    switch (event.action) {
      case 'togglePaused': {
        states.paused = media.paused !== undefined ? !media.paused : null;
        break;
      }
      case 'toggleMuted': {
        if (media.volume !== undefined && media.muted !== undefined) {
          const willBeMuted = !media.muted;
          states.volumeLevel = willBeMuted ? 'off' : volumeLevel(media.volume);
          label = willBeMuted ? this.labels.muted : `${Math.round(media.volume * 100)}%`;
          states.volumeLabel = label;
        }
        break;
      }
      case 'volumeStep': {
        if (media.volume !== undefined && event.value != null) {
          const expected = Math.max(0, Math.min(1, media.volume + event.value));
          states.volumeLevel = volumeLevel(expected);
          if (expected === media.volume && this.state.current.active) {
            states.boundary = event.value < 0 ? 'min' : 'max';
          }
          label = `${Math.round(expected * 100)}%`;
          states.volumeLabel = label;
        }
        break;
      }
      case 'toggleFullscreen': {
        states.fullscreen = media.fullscreen !== undefined ? !media.fullscreen : null;
        break;
      }
      case 'toggleSubtitles': {
        const next = media.subtitlesShowing !== undefined ? !media.subtitlesShowing : null;
        states.captions = next;
        if (next !== null) {
          label = next ? this.labels.captionsOn : this.labels.captionsOff;
          states.captionsLabel = label;
        }
        break;
      }
      case 'togglePictureInPicture': {
        states.pip = media.pip !== undefined ? !media.pip : null;
        break;
      }
    }

    return { label, expectedStates: states };
  }

  /**
   * Clamp the seek value on rapid-repeat taps so the displayed total never
   * exceeds what can actually be seeked from the ripple's origin time.
   */
  #clampSeekValue(event: InputFeedbackEvent, media: InputFeedbackMediaState): InputFeedbackEvent {
    if (event.action !== 'seekStep' || event.value == null || this.#rippleOriginTime === null) {
      return event;
    }

    const originTime = this.#rippleOriginTime;
    const duration = media.duration ?? Infinity;
    const currentTotal = this.state.current.seekTotal;

    const step = Math.abs(event.value);
    const room =
      event.value < 0 ? Math.max(0, originTime - currentTotal) : Math.max(0, duration - originTime - currentTotal);
    const effectiveValue = room >= step ? event.value : 0;

    return effectiveValue === event.value ? event : { ...event, value: effectiveValue };
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  #clearBoundaryTimer(): void {
    if (this.#boundaryTimer !== null) {
      clearTimeout(this.#boundaryTimer);
      this.#boundaryTimer = null;
    }
  }

  #clearBoundaryRestartTimer(): void {
    if (this.#boundaryRestartTimer !== null) {
      clearTimeout(this.#boundaryRestartTimer);
      this.#boundaryRestartTimer = null;
    }
  }

  #clearBoundaryTimers(): void {
    this.#clearBoundaryTimer();
    this.#clearBoundaryRestartTimer();
  }

  #scheduleBoundaryClear(): void {
    this.#clearBoundaryTimer();
    this.#boundaryTimer = setTimeout(() => {
      this.#boundaryTimer = null;
      this.state.patch({ boundary: null });
    }, BOUNDARY_CLEAR_DELAY);
  }

  #restartBoundary(boundary: NonNullable<InputFeedbackState['boundary']>): void {
    this.#clearBoundaryTimers();
    this.#boundaryRestartTimer = setTimeout(() => {
      this.#boundaryRestartTimer = null;
      this.state.patch({ boundary });
      this.#scheduleBoundaryClear();
    }, 0);
  }
}

export interface InputFeedbackLabels {
  /** Shown in the volume island when muting. */
  muted: string;
  /** Shown in the captions island when enabling captions. */
  captionsOn: string;
  /** Shown in the captions island when disabling captions. */
  captionsOff: string;
  /** Used as the current playback label when playback is paused. */
  paused: string;
  /** Used as the current playback label when playback is active. */
  playing: string;
}

export namespace InputFeedbackCore {
  export type State = InputFeedbackState;
  export type Labels = InputFeedbackLabels;
  export type MediaState = InputFeedbackMediaState;
  export type Event = InputFeedbackEvent;

  export const defaultLabels: InputFeedbackLabels = {
    muted: 'Muted',
    captionsOn: 'Captions on',
    captionsOff: 'Captions off',
    paused: 'Paused',
    playing: 'Playing',
  };
}
