import { useMediaSelector } from '@videojs/store/react';
import type { PropsWithChildren } from 'react';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent } from '../utils/component-factory';

export function useFullscreenButtonState(_props?: any) {
  const fullscreen = useMediaSelector((state) => state.fullscreen);
  const requestFullscreen = useMediaSelector((state) => state.requestFullscreen);
  const exitFullscreen = useMediaSelector((state) => state.exitFullscreen);

  return {
    fullscreen,
    requestFullscreen,
    exitFullscreen,
  };
}

export type FullscreenButtonState = ReturnType<typeof useFullscreenButtonState>;

export function getFullscreenButtonProps(
  props: PropsWithChildren,
  state: FullscreenButtonState
): PropsWithChildren<Record<string, unknown>> {
  const baseProps: Record<string, any> = {
    /** @TODO Need another state provider in core for i18n (CJP) */
    /** aria attributes/props */
    role: 'button',
    'aria-label': state.fullscreen ? 'exit fullscreen' : 'enter fullscreen',
    /** tooltip */
    'data-tooltip': state.fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen',
    /** external props spread last to allow for overriding */
    ...props,
  };

  // Handle boolean data attribute: present with empty string when true, absent when false
  if (state.fullscreen) {
    baseProps['data-fullscreen'] = '';
  }

  return baseProps;
}

export type FullscreenButtonProps = ReturnType<typeof getFullscreenButtonProps>;

export function renderFullscreenButton(props: FullscreenButtonProps, state: FullscreenButtonState): React.JSX.Element {
  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        if (props.disabled) return;
        if (state.fullscreen) {
          state.exitFullscreen();
        } else {
          state.requestFullscreen();
        }
      }}
    >
      {props.children}
    </button>
  );
}

export const FullscreenButton: ConnectedComponent<FullscreenButtonProps, typeof renderFullscreenButton> =
  toConnectedComponent(useFullscreenButtonState, getFullscreenButtonProps, renderFullscreenButton, 'FullscreenButton');

export default FullscreenButton;
