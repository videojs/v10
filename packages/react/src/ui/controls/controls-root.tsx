'use client';

import { ControlsCore, ControlsDataAttrs } from '@videojs/core';
import { createControlsActivity, logMissingFeature, selectControls } from '@videojs/core/dom';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, useEffect, useState } from 'react';

import { useContainer, useMedia, usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { ControlsContextProvider } from './context';

export interface ControlsRootProps extends UIComponentProps<'div', ControlsCore.State> {
  children?: ReactNode | undefined;
}

/** Root container for player controls state and rendered control content. */
export const ControlsRoot = forwardRef(function ControlsRoot(
  componentProps: ControlsRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, children, ...elementProps } = componentProps;

  const controls = usePlayer(selectControls);
  const container = useContainer();
  const media = useMedia();

  const [core] = useState(() => new ControlsCore());

  // Wire up activity tracking on the container.
  useEffect(() => {
    if (!controls || !container || !media) return;

    const activity = createControlsActivity({
      getContainer: () => container as HTMLElement,
      getMedia: () => media,
      getControlsVisible: () => controls.controlsVisible,
      getUserActive: () => controls.userActive,
      setControls: (userActive, controlsVisible) => controls.setControls(userActive, controlsVisible),
    });

    return () => activity.destroy();
  }, [controls, container, media]);

  if (!controls) {
    if (__DEV__) logMissingFeature('Controls.Root', 'controls');
    return null;
  }

  core.setMedia(controls);
  const state = core.getState();

  return (
    <ControlsContextProvider value={{ state, stateAttrMap: ControlsDataAttrs }}>
      {renderElement(
        'div',
        { render, className, style },
        {
          state,
          stateAttrMap: ControlsDataAttrs,
          ref: [forwardedRef],
          props: [{ children }, elementProps],
        }
      )}
    </ControlsContextProvider>
  );
});

export namespace ControlsRoot {
  export type Props = ControlsRootProps;
  export type State = ControlsCore.State;
}
