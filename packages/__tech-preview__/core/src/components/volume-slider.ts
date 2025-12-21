import type { SliderState } from './slider';

import { Slider } from './slider';

export interface VolumeSliderState extends SliderState {
  volume: number;
  muted: boolean;
  volumeLevel: string;
  requestVolumeChange: (volume: number) => void;
  _volumeText: string;
}

export class VolumeSlider extends Slider {
  constructor() {
    super();
    this.setStepSize(0.1);
  }

  getState(): VolumeSliderState {
    const state = super.getState() as VolumeSliderState;

    // When dragging or keying, use pointer position for immediate feedback;
    // Otherwise, use current volume;
    let _fillWidth = 0;
    if (state._dragging || state._keying) {
      _fillWidth = state._pointerRatio * 100;
    } else {
      _fillWidth = state.muted ? 0 : (state.volume || 0) * 100;
    }

    const _volumeText = formatVolume(state.muted ? 0 : state.volume || 0);

    return { ...state, _fillWidth, _volumeText };
  }

  setState(newState: Partial<VolumeSliderState>): void {
    const state = this.getState();
    // When not dragging or keying, set pointer ratio to current volume.
    if (!state._dragging && !state._keying && newState.volume) {
      super.setState({ ...newState, _pointerRatio: newState.volume });
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

    const { _pointerRatio, requestVolumeChange } = super.getState() as VolumeSliderState;
    requestVolumeChange(_pointerRatio);
  }

  #handlePointerMove(event: PointerEvent) {
    super.handleEvent(event);

    const { _dragging, _pointerRatio, requestVolumeChange } = super.getState() as VolumeSliderState;

    if (_dragging) {
      requestVolumeChange(_pointerRatio);
    }
  }

  #handlePointerUp(event: PointerEvent) {
    const { _dragging, _pointerRatio, requestVolumeChange } = super.getState() as VolumeSliderState;

    if (_dragging) {
      requestVolumeChange(_pointerRatio);
    }

    super.handleEvent(event);
  }

  #handleKeyDown(event: KeyboardEvent) {
    super.handleEvent(event);

    const { _pointerRatio, requestVolumeChange } = super.getState() as VolumeSliderState;
    requestVolumeChange(_pointerRatio);
  }
}

function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}
