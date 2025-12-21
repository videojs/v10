import type { PropsWithChildren } from 'react';
import type { ConnectedComponent } from '../utils/component-factory';

import { muteButtonStateDefinition } from '@videojs/core/store';

import { shallowEqual } from '@videojs/utils';
import { useMemo } from 'react';

import { useMediaSelector, useMediaStore } from '@/store';
import { toConnectedComponent } from '../utils/component-factory';

export function useMuteButtonState(_props?: any): {
  volumeLevel: string;
  muted: boolean;
  requestMute: () => void;
  requestUnmute: () => void;
} {
  const mediaStore = useMediaStore();
  const mediaState = useMediaSelector(muteButtonStateDefinition.stateTransform, shallowEqual);
  const methods = useMemo(() => muteButtonStateDefinition.createRequestMethods(mediaStore.dispatch), [mediaStore]);

  return {
    volumeLevel: mediaState.volumeLevel,
    muted: mediaState.muted,
    requestMute: methods.requestMute,
    requestUnmute: methods.requestUnmute,
  } as const;
}

export type MuteButtonState = ReturnType<typeof useMuteButtonState>;

export function getMuteButtonProps(
  props: PropsWithChildren,
  state: MuteButtonState,
): PropsWithChildren<Record<string, unknown>> {
  const baseProps: Record<string, any> = {
    /** data attributes/props - non-boolean */
    'data-volume-level': state.volumeLevel,
    /** @TODO Need another state provider in core for i18n (CJP) */
    /** aria attributes/props */
    role: 'button',
    'aria-label': state.muted ? 'unmute' : 'mute',
    /** tooltip */
    'data-tooltip': state.muted ? 'Unmute' : 'Mute',
    /** external props spread last to allow for overriding */
    ...props,
  };

  // Handle boolean data attribute: present with empty string when true, absent when false
  if (state.muted) {
    baseProps['data-muted'] = '';
  }

  return baseProps;
}

export type MuteButtonProps = ReturnType<typeof getMuteButtonProps>;

export function renderMuteButton(props: MuteButtonProps, state: MuteButtonState): JSX.Element {
  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        if (props.disabled) return;
        if (state.volumeLevel === 'off') {
          state.requestUnmute();
        } else {
          state.requestMute();
        }
      }}
    >
      {props.children}
    </button>
  );
}

export const MuteButton: ConnectedComponent<MuteButtonProps, typeof renderMuteButton> = toConnectedComponent(
  useMuteButtonState,
  getMuteButtonProps,
  renderMuteButton,
  'MuteButton',
);

export default MuteButton;
