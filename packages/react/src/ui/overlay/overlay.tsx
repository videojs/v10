'use client';

import { OverlayCore, OverlayDataAttrs } from '@videojs/core';
import { selectControls, selectError } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

export interface OverlayProps extends UIComponentProps<'div', OverlayCore.State> {}

/** Decorative media overlay layer for controls and error scrims. */
export const Overlay = forwardRef(function Overlay(
  componentProps: OverlayProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;
  const controls = usePlayer(selectControls);
  const error = usePlayer(selectError);
  const [core] = useState(() => new OverlayCore());

  core.setMedia({ controls, error });
  const state = core.getState();

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap: OverlayDataAttrs,
      ref: [forwardedRef],
      props: [{ 'aria-hidden': 'true' }, elementProps],
    }
  );
});

export namespace Overlay {
  export type Props = OverlayProps;
  export type State = OverlayCore.State;
}
