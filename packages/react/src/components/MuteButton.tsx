import { usePlayer } from '@videojs/store/react';
import type { PropsWithChildren } from 'react';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent } from '../utils/component-factory';

export function useMuteButtonState(_props?: any) {
  const muted = usePlayer((state) => state.muted);
  const volumeLevel = usePlayer((state) => state.volumeLevel);
  const setMuted = usePlayer((state) => state.setMuted);

  return {
    volumeLevel,
    muted,
    setMuted,
  };
}

export type MuteButtonState = ReturnType<typeof useMuteButtonState>;

export function getMuteButtonProps(
  props: PropsWithChildren,
  state: MuteButtonState
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

export function renderMuteButton(props: MuteButtonProps, state: MuteButtonState): React.JSX.Element {
  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        if (props.disabled) return;
        if (state.volumeLevel === 'off') {
          state.setMuted(false);
        } else {
          state.setMuted(true);
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
  'MuteButton'
);

export default MuteButton;
