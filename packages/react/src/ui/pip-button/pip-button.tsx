'use client';

import { PipButtonCore, PipButtonDataAttrs } from '@videojs/core';
import { logMissingFeature, selectPiP } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

export interface PipButtonProps extends UIComponentProps<'button', PipButtonCore.State>, PipButtonCore.Props {}

export const PipButton = forwardRef(function PipButton(
  componentProps: PipButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled, ...elementProps } = componentProps;

  const pip = usePlayer(selectPiP);

  const [core] = useState(() => new PipButtonCore());
  core.setProps({ label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'PipButton',
    onActivate: () => core.toggle(pip!),
    isDisabled: () => disabled || !pip,
  });

  if (!pip) {
    if (__DEV__) logMissingFeature('PipButton', 'pip');
    return null;
  }

  const state = core.getState(pip);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: PipButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(state), elementProps, getButtonProps()],
    }
  );
});

export namespace PipButton {
  export type Props = PipButtonProps;
  export type State = PipButtonCore.State;
}
