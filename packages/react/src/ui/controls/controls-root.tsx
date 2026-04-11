'use client';

import { ControlsCore, ControlsDataAttrs } from '@videojs/core';
import { attachControlsActivity, logMissingFeature, selectControls } from '@videojs/core/dom';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, useEffect, useState } from 'react';

import { useContainer, usePlayer } from '../../player/context';
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

  const [core] = useState(() => new ControlsCore());

  // Wire up activity tracking on the container.
  useEffect(() => {
    if (!controls || !container) return;

    const abort = new AbortController();

    attachControlsActivity(
      container as HTMLElement,
      {
        setActive: () => controls.setActive(),
        setInactive: () => controls.setInactive(),
        toggleControls: () => controls.toggleControls(),
      },
      abort.signal
    );

    return () => abort.abort();
  }, [controls, container]);

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
