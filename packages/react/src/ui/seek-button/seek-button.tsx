'use client';

import { SeekButtonCore, SeekButtonDataAttrs } from '@videojs/core';
import { logMissingFeature, selectTime } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

export interface SeekButtonProps extends UIComponentProps<'button', SeekButtonCore.State>, SeekButtonCore.Props {}

/**
 * A button that seeks forward or backward by a configurable number of seconds.
 *
 * @example
 * ```tsx
 * <SeekButton seconds={-10} />
 *
 * <SeekButton
 *   seconds={30}
 *   render={(props, state) => (
 *     <button {...props}>
 *       {state.seconds < 0 ? <RewindIcon /> : <FastForwardIcon />}
 *     </button>
 *   )}
 * />
 * ```
 */
export const SeekButton = forwardRef(function SeekButton(
  componentProps: SeekButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, seconds, label, disabled, ...elementProps } = componentProps;

  const time = usePlayer(selectTime);

  const [core] = useState(() => new SeekButtonCore());
  core.setProps({ seconds, label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'SeekButton',
    onActivate: () => core.seek(time!),
    isDisabled: () => disabled || !time,
  });

  if (!time) {
    if (__DEV__) logMissingFeature('SeekButton', 'time');
    return null;
  }

  const state = core.getState(time);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: SeekButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(state), elementProps, getButtonProps()],
    }
  );
});

export namespace SeekButton {
  export type Props = SeekButtonProps;
  export type State = SeekButtonCore.State;
}
