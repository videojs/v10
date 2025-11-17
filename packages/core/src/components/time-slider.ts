import type { SliderState } from './slider';

import { formatTime } from '@videojs/utils';
import { Slider } from './slider';

export interface TimeSliderState extends SliderState {
  currentTime: number;
  duration: number;
  requestSeek: (time: number) => void;
  requestPreview: (time: number) => void;
  _currentTimeText: string;
  _durationText: string;
}

export class TimeSlider extends Slider {
  #seekingTime: number | null = null;
  #oldCurrentTime: number | null = null;

  getState(): TimeSliderState {
    const state = super.getState() as TimeSliderState;

    // When dragging or keying, use pointer position for immediate feedback;
    // While seeking, use seeking time so it doesn't jump back to the current time;
    // Otherwise, use current time;
    let _fillWidth = 0;
    if (state._dragging || state._keying) {
      _fillWidth = state._pointerRatio * 100;
    } else if (state.duration > 0) {
      if (this.#seekingTime !== null && this.#oldCurrentTime === state.currentTime) {
        _fillWidth = (this.#seekingTime / state.duration) * 100;
      } else {
        _fillWidth = (state.currentTime / state.duration) * 100;
        this.#seekingTime = null;
      }
    }

    this.#oldCurrentTime = state.currentTime;

    const _currentTimeText = formatTime(state.currentTime);
    const _durationText = formatTime(state.duration);

    return { ...state, _fillWidth, _currentTimeText, _durationText };
  }

  setState(newState: Partial<TimeSliderState>): void {
    const state = this.getState();
    // When not dragging or keying, set pointer ratio to current time / duration.
    if (!state._dragging && !state._keying && newState.currentTime && newState.duration) {
      super.setState({ ...newState, _pointerRatio: newState.currentTime / newState.duration });
      return;
    }
    super.setState(newState);
  }

  handleEvent(event: Event): void {
    const { type } = event;
    switch (type) {
      case 'pointerdown':
        this.#handlePointerDown(event as PointerEvent);
        break;
      case 'pointermove':
        this.#handlePointerMove(event as PointerEvent);
        break;
      case 'pointerup':
        this.#handlePointerUp(event as PointerEvent);
        break;
      case 'keydown':
        this.#handleKeyDown(event as KeyboardEvent);
        break;
      default:
        super.handleEvent(event);
        break;
    }
  }

  #handlePointerDown(event: PointerEvent) {
    super.handleEvent(event);

    const { _pointerRatio, duration, requestSeek } = super.getState() as TimeSliderState;

    this.#seekingTime = _pointerRatio * duration;
    requestSeek(this.#seekingTime);
  }

  #handlePointerMove(event: PointerEvent) {
    super.handleEvent(event);

    const { _dragging, _pointerRatio, duration, requestSeek, requestPreview } = super.getState() as TimeSliderState;

    const previewTime = _pointerRatio * duration;
    requestPreview(previewTime);

    if (_dragging) {
      this.#seekingTime = previewTime;
      requestSeek(this.#seekingTime);
    }
  }

  #handlePointerUp(event: PointerEvent) {
    const { _dragging, _pointerRatio, duration, requestSeek } = super.getState() as TimeSliderState;

    if (_dragging) {
      this.#seekingTime = _pointerRatio * duration;
      requestSeek(this.#seekingTime);
    }

    super.handleEvent(event);
  }

  #handleKeyDown(event: KeyboardEvent) {
    super.handleEvent(event);

    const { _pointerRatio, duration, requestSeek } = super.getState() as TimeSliderState;

    this.#seekingTime = _pointerRatio * duration;
    requestSeek(this.#seekingTime);
  }
}
