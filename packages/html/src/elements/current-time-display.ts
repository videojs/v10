import type { CurrentTimeDisplayState } from '@videojs/store';
import { currentTimeDisplayStateDefinition } from '@videojs/store';
import { formatDisplayTime } from '@videojs/utils';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';
import { toConnectedHTMLComponent } from '../utils/component-factory';

export const getCurrentTimeDisplayState: StateHook<CurrentTimeDisplay, CurrentTimeDisplayState> = (
  _element,
  mediaStore
) => {
  return {
    ...currentTimeDisplayStateDefinition.stateTransform(mediaStore.getState()),
    // Current time display is read-only, so no request methods needed
  };
};

export const getCurrentTimeDisplayProps: PropsHook<CurrentTimeDisplay, CurrentTimeDisplayState> = (
  _element,
  _state
) => {
  return {};
};

export class CurrentTimeDisplay extends HTMLElement {
  static shadowRootOptions = {
    mode: 'open' as ShadowRootMode,
  };

  static observedAttributes: string[] = ['show-remaining'];

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof CurrentTimeDisplay).shadowRootOptions);
    }
  }

  get showRemaining(): boolean {
    return this.hasAttribute('show-remaining');
  }

  _update(_props: any, state: CurrentTimeDisplayState): void {
    /** @TODO Should this live here or elsewhere? (CJP) */
    const timeLabel =
      this.showRemaining && state.duration != null && state.currentTime != null
        ? formatDisplayTime(-(state.duration - state.currentTime))
        : formatDisplayTime(state.currentTime);

    if (this.shadowRoot) {
      this.shadowRoot.textContent = timeLabel;
    }
  }
}

export const CurrentTimeDisplayElement: ConnectedComponentConstructor<CurrentTimeDisplay, CurrentTimeDisplayState> =
  toConnectedHTMLComponent(
    CurrentTimeDisplay,
    getCurrentTimeDisplayState,
    getCurrentTimeDisplayProps,
    'CurrentTimeDisplay'
  );
