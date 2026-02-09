'use client';

import { MuteButtonCore, MuteButtonDataAttrs } from '@videojs/core';
import { logMissingFeature, selectVolume } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

export interface MuteButtonProps extends UIComponentProps<'button', MuteButtonCore.State>, MuteButtonCore.Props {}

/**
 * A button that toggles mute state.
 */
export const MuteButton = forwardRef(function MuteButton(
  componentProps: MuteButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled = false, ...elementProps } = componentProps;

  const volume = usePlayer(selectVolume);

  const [core] = useState(() => new MuteButtonCore());
  core.setProps({ label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'MuteButton',
    onActivate: () => core.toggle(volume!),
    isDisabled: () => disabled || !volume,
  });

  if (!volume) {
    logMissingFeature('MuteButton', 'volume');
    return null;
  }

  const state = core.getState(volume);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: MuteButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(state), elementProps, getButtonProps()],
    }
  );
});

export namespace MuteButton {
  export type Props = MuteButtonProps;
  export type State = MuteButtonCore.State;
}
