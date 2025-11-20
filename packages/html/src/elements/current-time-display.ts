import type { CurrentTimeDisplayState, MediaStore } from '@videojs/core/store';
import type { ConnectedComponentConstructor, PropsHook } from '../utils/component-factory';

import { currentTimeDisplayStateDefinition } from '@videojs/core/store';

import { formatDisplayTime } from '@videojs/utils';
import { toConnectedHTMLComponent } from '../utils/component-factory';

export class CurrentTimeDisplay extends HTMLElement {
  static shadowRootOptions = {
    mode: 'open' as ShadowRootMode,
  };

  static observedAttributes: string[] = ['show-remaining'];

  _state:
    | {
      currentTime: number | undefined;
      duration: number | undefined;
    }
    | undefined;

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof CurrentTimeDisplay).shadowRootOptions);
    }
  }

  get currentTime(): number {
    return this._state?.currentTime ?? 0;
  }

  get duration(): number {
    return this._state?.duration ?? 0;
  }

  get showRemaining(): boolean {
    return this.hasAttribute('show-remaining');
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'show-remaining' && this._state) {
      // Re-render with current state when show-remaining attribute changes
      this._update({}, this._state);
    }
  }

  _update(_props: any, state: any): void {
    this._state = state;

    /** @TODO Should this live here or elsewhere? (CJP) */
    const timeLabel
      = this.showRemaining && state.duration != null && state.currentTime != null
        ? formatDisplayTime(-(state.duration - state.currentTime))
        : formatDisplayTime(state.currentTime);

    if (this.shadowRoot) {
      this.shadowRoot.textContent = timeLabel;
    }
  }
}

export function getCurrentTimeDisplayState(_element: HTMLElement, mediaStore: MediaStore): {
  currentTime: number | undefined;
  duration: number | undefined;
} {
  return {
    ...currentTimeDisplayStateDefinition.stateTransform(mediaStore.getState()),
    // Current time display is read-only, so no request methods needed
  };
}

export const getCurrentTimeDisplayProps: PropsHook<{
  currentTime: number | undefined;
  duration: number | undefined;
}> = (_element, _state) => {
  const baseProps: Record<string, any> = {};
  return baseProps;
};

export const CurrentTimeDisplayElement: ConnectedComponentConstructor<CurrentTimeDisplayState> = toConnectedHTMLComponent(
  CurrentTimeDisplay,
  getCurrentTimeDisplayState,
  getCurrentTimeDisplayProps,
  'CurrentTimeDisplay',
);
