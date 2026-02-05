'use client';

import { FullscreenButtonCore, FullscreenButtonDataAttributes } from '@videojs/core';
import { logMissingFeature, selectPresentation } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

export interface FullscreenButtonProps
  extends UIComponentProps<'button', FullscreenButtonCore.State>,
    FullscreenButtonCore.Props {}

export const FullscreenButton = forwardRef(function FullscreenButton(
  componentProps: FullscreenButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled = false, ...elementProps } = componentProps;

  const presentation = usePlayer(selectPresentation);

  const [core] = useState(() => new FullscreenButtonCore());
  core.setProps({ label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'FullscreenButton',
    onActivate: () => core.toggle(presentation!),
    isDisabled: () => disabled || !presentation,
  });

  if (!presentation) {
    logMissingFeature('FullscreenButton', 'presentation');
    return null;
  }

  return renderElement(
    'button',
    { render, className, style },
    {
      state: core.getState(presentation),
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(presentation), elementProps, getButtonProps()],
      stateAttrMap: FullscreenButtonDataAttributes,
    }
  );
});

export namespace FullscreenButton {
  export type Props = FullscreenButtonProps;
  export type State = FullscreenButtonCore.State;
}
