'use client';

import { PiPButtonCore, PiPButtonDataAttrs } from '@videojs/core';
import { logMissingFeature, selectPiP } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

export interface PiPButtonProps extends UIComponentProps<'button', PiPButtonCore.State>, PiPButtonCore.Props {}

export const PiPButton = forwardRef(function PiPButton(
  componentProps: PiPButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled, ...elementProps } = componentProps;

  const pip = usePlayer(selectPiP);

  const [core] = useState(() => new PiPButtonCore());
  core.setProps({ label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'PiPButton',
    onActivate: () => core.toggle(pip!),
    isDisabled: () => disabled || !pip,
  });

  if (!pip) {
    if (__DEV__) logMissingFeature('PiPButton', 'pip');
    return null;
  }

  const state = core.getState(pip);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: PiPButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(state), elementProps, getButtonProps()],
    }
  );
});

export namespace PiPButton {
  export type Props = PiPButtonProps;
  export type State = PiPButtonCore.State;
}
