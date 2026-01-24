import { playButtonStateDefinition } from '@videojs/store';
import { shallowEqual } from '@videojs/utils';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { useMediaSelector, useMediaStore } from '@/store';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent } from '../utils/component-factory';

export function usePlayButtonState(_props?: any): {
  paused: boolean;
  requestPlay: () => void;
  requestPause: () => void;
} {
  const mediaStore = useMediaStore();
  const mediaState = useMediaSelector(playButtonStateDefinition.stateTransform, shallowEqual);
  const methods = useMemo(() => playButtonStateDefinition.createRequestMethods(mediaStore.dispatch), [mediaStore]);

  return {
    paused: mediaState.paused,
    requestPlay: methods.requestPlay,
    requestPause: methods.requestPause,
  };
}

export type PlayButtonState = ReturnType<typeof usePlayButtonState>;

export function getPlayButtonProps(
  props: Record<string, unknown>,
  state: PlayButtonState
): PropsWithChildren<Record<string, unknown>> {
  const baseProps: Record<string, any> = {
    /** @TODO Need another state provider in core for i18n (CJP) */
    /** aria attributes/props */
    role: 'button',
    'aria-label': state.paused ? 'play' : 'pause',
    /** tooltip */
    'data-tooltip': state.paused ? 'Play' : 'Pause',
    /** external props spread last to allow for overriding */
    ...props,
  };

  // Handle boolean data attribute: present with empty string when true, absent when false
  if (state.paused) {
    baseProps['data-paused'] = '';
  }

  return baseProps;
}

export type PlayButtonProps = ReturnType<typeof getPlayButtonProps>;

export function renderPlayButton(props: PlayButtonProps, state: PlayButtonState): JSX.Element {
  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        if (props.disabled) return;
        if (state.paused) {
          state.requestPlay();
        } else {
          state.requestPause();
        }
      }}
    >
      {props.children}
    </button>
  );
}

export const PlayButton: ConnectedComponent<PlayButtonProps, typeof renderPlayButton> = toConnectedComponent(
  usePlayButtonState,
  getPlayButtonProps,
  renderPlayButton,
  'PlayButton'
);

export default PlayButton;
