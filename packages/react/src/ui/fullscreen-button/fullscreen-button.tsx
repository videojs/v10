'use client';

import { FullscreenButtonCore, FullscreenButtonDataAttrs } from '@videojs/core';
import { logMissingFeature, selectFullscreen } from '@videojs/core/dom';
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
  const { render, className, style, label, disabled, ...elementProps } = componentProps;

  const fullscreen = usePlayer(selectFullscreen);

  const [core] = useState(() => new FullscreenButtonCore());
  core.setProps({ label, disabled });

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'FullscreenButton',
    onActivate: () => core.toggle(fullscreen!),
    isDisabled: () => disabled || !fullscreen,
  });

  if (!fullscreen) {
    if (__DEV__) logMissingFeature('FullscreenButton', 'fullscreen');
    return null;
  }

  const state = core.getState(fullscreen);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: FullscreenButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [core.getAttrs(state), elementProps, getButtonProps()],
    }
  );
});

export namespace FullscreenButton {
  export type Props = FullscreenButtonProps;
  export type State = FullscreenButtonCore.State;
}
