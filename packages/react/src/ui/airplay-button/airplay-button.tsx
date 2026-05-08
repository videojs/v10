'use client';

import { AirplayButtonCore, AirplayButtonDataAttrs } from '@videojs/core';
import { selectRemotePlayback } from '@videojs/core/dom';

import type { UIComponentProps } from '../../utils/types';
import { createMediaButton } from '../create-media-button';

export interface AirplayButtonProps
  extends UIComponentProps<'button', AirplayButtonCore.State>,
    AirplayButtonCore.Props {}

/** A button that toggles AirPlay to a remote device. */
export const AirplayButton = createMediaButton<AirplayButtonCore, AirplayButtonProps>({
  displayName: 'AirplayButton',
  core: AirplayButtonCore,
  stateAttrMap: AirplayButtonDataAttrs,
  selector: selectRemotePlayback,
  action: (core, state) => core.toggle(state),
});

export namespace AirplayButton {
  export type Props = AirplayButtonProps;
  export type State = AirplayButtonCore.State;
}
