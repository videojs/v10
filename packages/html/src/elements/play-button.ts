import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';
import { toConnectedHTMLComponent } from '../utils/component-factory';
import { ButtonElement } from './button';

type PlayButtonState = {
  paused: boolean;
  play: () => void;
  pause: () => void;
};

/**
 * PlayButton state hook - equivalent to React's usePlayButtonState
 * Handles media store state subscription and transformation
 */
export const getPlayButtonState: StateHook<PlayButton, PlayButtonState> = (_element, mediaStore) => {
  const state = mediaStore.getState();
  return {
    paused: state.paused,
    play: state.play,
    pause: state.pause,
  };
};

export const getPlayButtonProps: PropsHook<PlayButton, PlayButtonState> = (_element, state) => {
  const baseProps: Record<string, any> = {
    /** data attributes/props */
    'data-paused': state.paused,
    /** @TODO Need another state provider in core for i18n (CJP) */
    /** aria attributes/props */
    role: 'button',
    tabindex: '0',
    'aria-label': state.paused ? 'play' : 'pause',
    /** tooltip */
    'data-tooltip': state.paused ? 'Play' : 'Pause',
    /** @TODO Figure out how we want to handle attr overrides (e.g. aria-label) (CJP) */
    /** external props spread last to allow for overriding */
    // ...props,
  };

  return baseProps;
};

export class PlayButton extends ButtonElement {
  _state: PlayButtonState | undefined;

  handleEvent(event: Event): void {
    super.handleEvent(event);

    const { type } = event;
    const state = this._state;
    if (state && type === 'click') {
      if (state.paused) {
        state.play();
      } else {
        state.pause();
      }
    }
  }
}

export const PlayButtonElement: ConnectedComponentConstructor<PlayButton, PlayButtonState> = toConnectedHTMLComponent(
  PlayButton,
  getPlayButtonState,
  getPlayButtonProps,
  'PlayButton'
);
