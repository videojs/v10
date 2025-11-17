import type { MediaStore, MuteButtonState } from '@videojs/core/store';
import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook } from '../utils/component-factory';

import { muteButtonStateDefinition } from '@videojs/core/store';

import { setAttributes } from '@videojs/utils/dom';
import { toConnectedHTMLComponent } from '../utils/component-factory';
import { ButtonElement } from './button';

export class MuteButton extends ButtonElement {
  _state:
    | {
      muted: boolean;
      volumeLevel: string;
      requestMute: () => void;
      requestUnmute: () => void;
    }
    | undefined;

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

  get muted(): boolean {
    return this._state?.muted ?? false;
  }

  get volumeLevel(): string {
    return this._state?.volumeLevel ?? 'high';
  }

  _update(props: any, state: any): void {
    this._state = state;
    /** @TODO Follow up with React vs. W.C. data-* attributes discrepancies (CJP)  */
    setAttributes(this, props);
  }
}

type MuteButtonStateWithMethods = Prettify<MuteButtonState & ReturnType<typeof muteButtonStateDefinition.createRequestMethods>>;

export function getMuteButtonState(mediaStore: MediaStore): MuteButtonStateWithMethods {
  return {
    ...muteButtonStateDefinition.stateTransform(mediaStore.getState()),
    ...muteButtonStateDefinition.createRequestMethods(mediaStore.dispatch),
  };
}

export const getMuteButtonProps: PropsHook<{
  muted: boolean;
  volumeLevel: string;
}> = (state, _element) => {
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

export const MuteButtonElement: ConnectedComponentConstructor<MuteButtonStateWithMethods> = toConnectedHTMLComponent(
  MuteButton,
  getMuteButtonState,
  getMuteButtonProps,
  'MuteButton',
);
