import { usePlayer } from '@videojs/store/react';
import type { PropsWithChildren } from 'react';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent } from '../utils/component-factory';

export function usePlayButtonState(_props?: any) {
  const paused = usePlayer((state) => state.paused);
  const play = usePlayer((state) => state.play);
  const pause = usePlayer((state) => state.pause);

  return {
    paused,
    play,
    pause,
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

export function renderPlayButton(props: PlayButtonProps, state: PlayButtonState): React.JSX.Element {
  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        if (props.disabled) return;
        if (state.paused) {
          state.play();
        } else {
          state.pause();
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
