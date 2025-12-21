import type { FullscreenButtonState } from '@videojs/core-preview/store';
import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';

import { fullscreenButtonStateDefinition } from '@videojs/core-preview/store';

import { memoize } from '@videojs/utils-preview';
import { toConnectedHTMLComponent } from '../utils/component-factory';
import { ButtonElement } from './button';

type FullscreenButtonStateWithMethods = Prettify<FullscreenButtonState & ReturnType<typeof fullscreenButtonStateDefinition.createRequestMethods>>;

const fullscreenButtonCreateRequestMethods = memoize(fullscreenButtonStateDefinition.createRequestMethods);

/**
 * FullscreenButton state hook - equivalent to React's useFullscreenButtonState
 * Handles media store state subscription and transformation
 */
export const getFullscreenButtonState: StateHook<FullscreenButton, FullscreenButtonStateWithMethods> = (_element, mediaStore) => {
  return {
    ...fullscreenButtonStateDefinition.stateTransform(mediaStore.getState()),
    ...fullscreenButtonCreateRequestMethods(mediaStore.dispatch),
  };
};

export const getFullscreenButtonProps: PropsHook<FullscreenButton, FullscreenButtonStateWithMethods> = (_element, state) => {
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
  _state: FullscreenButtonStateWithMethods | undefined;

  handleEvent(event: Event): void {
    super.handleEvent(event);

    const { type } = event;
    const state = this._state;
    if (state && type === 'click') {
      if (state.fullscreen) {
        state.requestExitFullscreen();
      } else {
        state.requestEnterFullscreen();
      }
    }
  }
}

export const FullscreenButtonElement: ConnectedComponentConstructor<FullscreenButton, FullscreenButtonStateWithMethods> = toConnectedHTMLComponent(
  FullscreenButton,
  getFullscreenButtonState,
  getFullscreenButtonProps,
  'FullscreenButton',
);
