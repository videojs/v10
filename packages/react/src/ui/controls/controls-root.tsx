import { ControlsCore, ControlsDataAttrs } from '@videojs/core';
import { selectControls } from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { usePlayer } from '../../player/context';
import { useLogMissingFeature } from '../hooks/use-log-missing-feature';
import { ControlsContextProvider } from './context';

export interface ControlsRootProps {
  children?: ReactNode | undefined;
}

/** Manages controls state and provides it to the compound parts. Does not render an element. */
export function ControlsRoot({ children }: ControlsRootProps): ReactNode {
  const controls = usePlayer(selectControls);
  const [core] = useState(() => new ControlsCore());

  useLogMissingFeature(!controls, 'Controls.Root', 'controls');

  if (!controls) return null;

  core.setMedia(controls);
  const state = core.getState();

  return (
    <ControlsContextProvider value={{ state, stateAttrMap: ControlsDataAttrs }}>{children}</ControlsContextProvider>
  );
}

export namespace ControlsRoot {
  export type Props = ControlsRootProps;
  export type State = ControlsCore.State;
}
