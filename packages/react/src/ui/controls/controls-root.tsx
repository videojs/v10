'use client';

import { ControlsCore, ControlsDataAttrs } from '@videojs/core';
import { selectControls } from '@videojs/core/dom';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, useEffect, useState } from 'react';

import { useControlsRegister, usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { ControlsContextProvider } from './context';

export interface ControlsRootProps extends UIComponentProps<'div', ControlsCore.State> {
  children?: ReactNode | undefined;
}

const fallbackState: ControlsCore.State = {
  visible: true,
  userActive: true,
};

/** Root container for player controls state and rendered control content. */
export const ControlsRoot = forwardRef(function ControlsRoot(
  componentProps: ControlsRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, children, ...elementProps } = componentProps;

  const controls = usePlayer(selectControls);
  const register = useControlsRegister();

  const [core] = useState(() => new ControlsCore());

  useEffect(() => {
    return register?.();
  }, [register]);

  if (!controls) {
    return (
      <ControlsContextProvider value={{ state: fallbackState, stateAttrMap: ControlsDataAttrs }}>
        {renderElement(
          'div',
          { render, className, style },
          {
            state: fallbackState,
            stateAttrMap: ControlsDataAttrs,
            ref: [forwardedRef],
            props: [{ children }, elementProps],
          }
        )}
      </ControlsContextProvider>
    );
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
