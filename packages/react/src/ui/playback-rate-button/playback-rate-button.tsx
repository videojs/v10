'use client';

import { PlaybackRateButtonCore, PlaybackRateButtonDataAttrs } from '@videojs/core';
import { logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

export interface PlaybackRateButtonProps
  extends UIComponentProps<'button', PlaybackRateButtonCore.State>,
    PlaybackRateButtonCore.Props {}

/**
 * A button that cycles through playback rates.
 *
 * @example
 * ```tsx
 * <PlaybackRateButton />
 *
 * <PlaybackRateButton
 *   render={(props, state) => (
 *     <button {...props}>
 *       {state.rate}&times;
 *     </button>
 *   )}
 * />
 * ```
 */
export const PlaybackRateButton = forwardRef(function PlaybackRateButton(
  componentProps: PlaybackRateButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled, ...elementProps } = componentProps;

  const playbackRate = usePlayer(selectPlaybackRate);

  const [core] = useState(() => new PlaybackRateButtonCore());
  core.setProps({ label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'PlaybackRateButton',
    onActivate: () => core.cycle(playbackRate!),
    isDisabled: () => disabled || !playbackRate,
  });

  if (!playbackRate) {
    if (__DEV__) logMissingFeature('PlaybackRateButton', 'playbackRate');
    return null;
  }

  const state = core.getState(playbackRate);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: PlaybackRateButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(state), elementProps, getButtonProps()],
    }
  );
});

export namespace PlaybackRateButton {
  export type Props = PlaybackRateButtonProps;
  export type State = PlaybackRateButtonCore.State;
}
