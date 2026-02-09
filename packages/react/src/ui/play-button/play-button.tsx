'use client';

import { PlayButtonCore, PlayButtonDataAttrs } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

export interface PlayButtonProps extends UIComponentProps<'button', PlayButtonCore.State>, PlayButtonCore.Props {}

/**
 * A button that toggles playback.
 *
 * @example
 * ```tsx
 * <PlayButton />
 *
 * <PlayButton
 *   render={(props, state) => (
 *     <button {...props}>
 *       {state.paused ? <PlayIcon /> : <PauseIcon />}
 *     </button>
 *   )}
 * />
 * ```
 */
export const PlayButton = forwardRef(function PlayButton(
  componentProps: PlayButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled = false, ...elementProps } = componentProps;

  const playback = usePlayer(selectPlayback);

  const [core] = useState(() => new PlayButtonCore());
  core.setProps({ label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'PlayButton',
    onActivate: () => core.toggle(playback!),
    isDisabled: () => disabled || !playback,
  });

  if (!playback) {
    if (__DEV__) logMissingFeature('PlayButton', 'playback');
    return null;
  }

  const state = core.getState(playback);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: PlayButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(state), elementProps, getButtonProps()],
    }
  );
});

export namespace PlayButton {
  export type Props = PlayButtonProps;
  export type State = PlayButtonCore.State;
}
