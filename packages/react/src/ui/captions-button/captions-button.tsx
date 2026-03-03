'use client';

import { CaptionsButtonCore, CaptionsButtonDataAttrs } from '@videojs/core';
import { logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

export type CaptionsButtonState = CaptionsButtonCore.State;

export interface CaptionsButtonProps
  extends UIComponentProps<'button', CaptionsButtonState>,
    CaptionsButtonCore.Props {}

/**
 * A button that toggles captions.
 *
 * @example
 * ```tsx
 * <CaptionsButton />
 *
 * <CaptionsButton
 *   render={(props, state) => (
 *     <button {...props}>
 *       {state.subtitlesShowing ? <CaptionsOnIcon /> : <CaptionsOffIcon />}
 *     </button>
 *   )}
 * />
 * ```
 */
export const CaptionsButton = forwardRef(function CaptionsButton(
  componentProps: CaptionsButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled, ...elementProps } = componentProps;

  const textTrack = usePlayer(selectTextTrack);

  const [core] = useState(() => new CaptionsButtonCore());
  core.setProps({ label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'CaptionsButton',
    onActivate: () => core.toggle(textTrack!),
    isDisabled: () => disabled || !textTrack,
  });

  if (!textTrack) {
    if (__DEV__) logMissingFeature('CaptionsButton', 'textTrack');
    return null;
  }

  if (!textTrack.subtitlesList.length) return null;

  const state = core.getState(textTrack);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: CaptionsButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(state), elementProps, getButtonProps()],
    }
  );
});

export namespace CaptionsButton {
  export type Props = CaptionsButtonProps;
  export type State = CaptionsButtonCore.State;
}
