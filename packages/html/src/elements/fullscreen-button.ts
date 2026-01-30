import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';
import { toConnectedHTMLComponent } from '../utils/component-factory';
import { ButtonElement } from './button';

type FullscreenButtonState = {
  fullscreen: boolean;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
};

/**
 * FullscreenButton state hook - equivalent to React's useFullscreenButtonState
 * Handles player store state subscription and transformation
 */
export const getFullscreenButtonState: StateHook<FullscreenButton, FullscreenButtonState> = (_element, playerStore) => {
  const state = playerStore.getState();
  return {
    fullscreen: state.fullscreen,
    requestFullscreen: state.requestFullscreen,
    exitFullscreen: state.exitFullscreen,
  };
};

export const getFullscreenButtonProps: PropsHook<FullscreenButton, FullscreenButtonState> = (_element, state) => {
  const baseProps: Record<string, any> = {
    /** data attributes/props */
    'data-fullscreen': state.fullscreen,
    /** @TODO Need another state provider in core for i18n (CJP) */
    /** aria attributes/props */
    role: 'button',
    tabindex: '0',
    'aria-label': state.fullscreen ? 'exit fullscreen' : 'enter fullscreen',
    /** tooltip */
    'data-tooltip': state.fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen',
    /** @TODO Figure out how we want to handle attr overrides (e.g. aria-label) (CJP) */
    /** external props spread last to allow for overriding */
    // ...props,
  };
  return baseProps;
};

export class FullscreenButton extends ButtonElement {
  _state: FullscreenButtonState | undefined;

  handleEvent(event: Event): void {
    super.handleEvent(event);

    const { type } = event;
    const state = this._state;
    if (state && type === 'click') {
      if (state.fullscreen) {
        state.exitFullscreen();
      } else {
        state.requestFullscreen();
      }
    }
  }
}

export const FullscreenButtonElement: ConnectedComponentConstructor<FullscreenButton, FullscreenButtonState> =
  toConnectedHTMLComponent(FullscreenButton, getFullscreenButtonState, getFullscreenButtonProps, 'FullscreenButton');
