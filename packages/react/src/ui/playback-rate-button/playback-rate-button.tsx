'use client';

import { PlaybackRateButtonCore, PlaybackRateButtonDataAttrs } from '@videojs/core';
import { selectPlaybackRate } from '@videojs/core/dom';

import type { UIComponentProps } from '../../utils/types';
import { createMediaButton } from '../create-media-button';

/** Props for the PlaybackRateButton component. */
export interface PlaybackRateButtonProps
  extends UIComponentProps<'button', PlaybackRateButtonCore.State>,
    PlaybackRateButtonCore.Props {}

/** A button that cycles through the configured playback rates. */
export const PlaybackRateButton = createMediaButton<PlaybackRateButtonCore, PlaybackRateButtonProps>({
  displayName: 'PlaybackRateButton',
  core: PlaybackRateButtonCore,
  stateAttrMap: PlaybackRateButtonDataAttrs,
  selector: selectPlaybackRate,
  action: (core, state) => core.cycle(state),
});

export namespace PlaybackRateButton {
  export type Props = PlaybackRateButtonProps;
  export type State = PlaybackRateButtonCore.State;
}
