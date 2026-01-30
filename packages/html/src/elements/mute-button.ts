import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';
import { toConnectedHTMLComponent } from '../utils/component-factory';
import { ButtonElement } from './button';

type MuteButtonState = {
  muted: boolean;
  volumeLevel: 'high' | 'medium' | 'low' | 'off';
  setMuted: (value: boolean) => void;
};

/**
 * MuteButton state hook - equivalent to React's useMuteButtonState
 * Handles media store state subscription and transformation
 */
export const getMuteButtonState: StateHook<MuteButton, MuteButtonState> = (_element, mediaStore) => {
  const state = mediaStore.getState();
  return {
    muted: state.muted,
    volumeLevel: state.volumeLevel,
    setMuted: state.setMuted,
  };
};

export const getMuteButtonProps: PropsHook<MuteButton, MuteButtonState> = (_element, state) => {
  const baseProps: Record<string, any> = {
    /** data attributes/props */
    'data-muted': state.muted,
    'data-volume-level': state.volumeLevel,
    /** @TODO Need another state provider in core for i18n (CJP) */
    /** aria attributes/props */
    role: 'button',
    tabindex: '0',
    'aria-label': state.muted ? 'unmute' : 'mute',
    /** tooltip */
    'data-tooltip': state.muted ? 'Unmute' : 'Mute',
    /** @TODO Figure out how we want to handle attr overrides (e.g. aria-label) (CJP) */
    /** external props spread last to allow for overriding */
    // ...props,
  };
  return baseProps;
};

export class MuteButton extends ButtonElement {
  _state: MuteButtonState | undefined;

  handleEvent(event: Event): void {
    super.handleEvent(event);

    const { type } = event;
    const state = this._state;

    if (state) {
      if (type === 'click') {
        if (state.volumeLevel === 'off') {
          state.setMuted(false);
        } else {
          state.setMuted(true);
        }
      }
    }
  }
}

export const MuteButtonElement: ConnectedComponentConstructor<MuteButton, MuteButtonState> = toConnectedHTMLComponent(
  MuteButton,
  getMuteButtonState,
  getMuteButtonProps,
  'MuteButton'
);
