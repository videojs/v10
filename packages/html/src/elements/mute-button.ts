import type { MuteButtonState } from '@videojs/store';
import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';

import { muteButtonStateDefinition } from '@videojs/store';

import { memoize } from '@videojs/utils';
import { toConnectedHTMLComponent } from '../utils/component-factory';
import { ButtonElement } from './button';

type MuteButtonStateWithMethods = Prettify<MuteButtonState & ReturnType<typeof muteButtonStateDefinition.createRequestMethods>>;

const muteButtonCreateRequestMethods = memoize(muteButtonStateDefinition.createRequestMethods);

export const getMuteButtonState: StateHook<MuteButton, MuteButtonStateWithMethods> = (_element, mediaStore) => {
  return {
    ...muteButtonStateDefinition.stateTransform(mediaStore.getState()),
    ...muteButtonCreateRequestMethods(mediaStore.dispatch),
  };
};

export const getMuteButtonProps: PropsHook<MuteButton, MuteButtonStateWithMethods> = (_element, state) => {
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
  _state: MuteButtonStateWithMethods | undefined;

  handleEvent(event: Event): void {
    super.handleEvent(event);

    const { type } = event;
    const state = this._state;

    if (state) {
      if (type === 'click') {
        if (state.volumeLevel === 'off') {
          state.requestUnmute();
        } else {
          state.requestMute();
        }
      }
    }
  }
}

export const MuteButtonElement: ConnectedComponentConstructor<MuteButton, MuteButtonStateWithMethods> = toConnectedHTMLComponent(
  MuteButton,
  getMuteButtonState,
  getMuteButtonProps,
  'MuteButton',
);
