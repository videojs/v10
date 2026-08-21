import { ControlsCore, ControlsDataAttrs } from '@videojs/core';
import { selectControls } from '@videojs/core/dom';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useLogMissingFeature } from '../hooks/use-log-missing-feature';
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
  useLogMissingFeature(!controls, 'Controls.Root', 'controls');

  if (!controls) {
    return null;
  }

  const core = new ControlsCore();
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
          props: [{ children }, elementProps, { 'data-interactive': '' }],
        }
      )}
    </ControlsContextProvider>
  );
});

export namespace ControlsRoot {
  export type Props = ControlsRootProps;
  export type State = ControlsCore.State;
}
