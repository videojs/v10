import type { FullscreenButtonState, MediaStore } from '@videojs/core/store';
import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook } from '../utils/component-factory';

import { fullscreenButtonStateDefinition } from '@videojs/core/store';

import { memoize } from '@videojs/utils';
import { setAttributes } from '@videojs/utils/dom';
import { toConnectedHTMLComponent } from '../utils/component-factory';
import { ButtonElement } from './button';

export class FullscreenButton extends ButtonElement {
  _state:
    | {
      fullscreen: boolean;
      requestEnterFullscreen: () => void;
      requestExitFullscreen: () => void;
    }
    | undefined;

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

  get fullscreen(): boolean {
    return this._state?.fullscreen ?? false;
  }

  _update(props: any, state: any, _mediaStore?: any): void {
    this._state = state;
    /** @TODO Follow up with React vs. W.C. data-* attributes discrepancies (CJP)  */
    setAttributes(this, props);
  }
}

type FullscreenButtonStateWithMethods = Prettify<FullscreenButtonState & ReturnType<typeof fullscreenButtonStateDefinition.createRequestMethods>>;

const fullscreenButtonCreateRequestMethods = memoize(fullscreenButtonStateDefinition.createRequestMethods);

/**
 * FullscreenButton state hook - equivalent to React's useFullscreenButtonState
 * Handles media store state subscription and transformation
 */
export function getFullscreenButtonState(_element: HTMLElement, mediaStore: MediaStore): FullscreenButtonStateWithMethods {
  return {
    ...fullscreenButtonStateDefinition.stateTransform(mediaStore.getState()),
    ...fullscreenButtonCreateRequestMethods(mediaStore.dispatch),
  };
}

export const getFullscreenButtonProps: PropsHook<{ fullscreen: boolean }> = (_element, state) => {
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

export const FullscreenButtonElement: ConnectedComponentConstructor<FullscreenButtonStateWithMethods> = toConnectedHTMLComponent(
  FullscreenButton,
  getFullscreenButtonState,
  getFullscreenButtonProps,
  'FullscreenButton',
);
