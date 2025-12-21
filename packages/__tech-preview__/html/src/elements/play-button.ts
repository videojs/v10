import type { PlayButtonState } from '@videojs/core/store';
import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';

import { playButtonStateDefinition } from '@videojs/core/store';
import { memoize } from '@videojs/utils';
import { toConnectedHTMLComponent } from '../utils/component-factory';
import { ButtonElement } from './button';

type PlayButtonStateWithMethods = Prettify<PlayButtonState & ReturnType<typeof playButtonStateDefinition.createRequestMethods>>;

const playButtonCreateRequestMethods = memoize(playButtonStateDefinition.createRequestMethods);

/**
 * PlayButton state hook - equivalent to React's usePlayButtonState
 * Handles media store state subscription and transformation
 */
export const getPlayButtonState: StateHook<PlayButton, PlayButtonStateWithMethods> = (_element, mediaStore) => {
  return {
    ...playButtonStateDefinition.stateTransform(mediaStore.getState()),
    ...playButtonCreateRequestMethods(mediaStore.dispatch),
  };
};

export const getPlayButtonProps: PropsHook<PlayButton, PlayButtonStateWithMethods> = (_element, state) => {
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
  _state: PlayButtonStateWithMethods | undefined;

  handleEvent(event: Event): void {
    super.handleEvent(event);

    const { type } = event;
    const state = this._state;
    if (state && type === 'click') {
      if (state.paused) {
        state.requestPlay();
      } else {
        state.requestPause();
      }
    }
  }
}

export const PlayButtonElement: ConnectedComponentConstructor<PlayButton, PlayButtonStateWithMethods> = toConnectedHTMLComponent(
  PlayButton,
  getPlayButtonState,
  getPlayButtonProps,
  'PlayButton',
);
