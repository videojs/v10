'use client';

import { VolumeIndicatorCore, VolumeIndicatorDataAttrs } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useInputIndicatorRoot } from '../input-indicators/use-input-indicator-root';
import { VolumeIndicatorProvider } from './context';

export interface VolumeIndicatorRootProps
  extends UIComponentProps<'div', VolumeIndicatorCore.State>,
    VolumeIndicatorCore.Props {}

export const VolumeIndicatorRoot = forwardRef(function VolumeIndicatorRoot(
  componentProps: VolumeIndicatorRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, closeDelay, ...elementProps } = componentProps;
  const { elementRef, present, state } = useInputIndicatorRoot(() => new VolumeIndicatorCore(), { closeDelay });

  if (!present) return null;

  return (
    <VolumeIndicatorProvider value={{ state }}>
      {renderElement(
        'div',
        { render, className, style },
        {
          state,
          stateAttrMap: VolumeIndicatorDataAttrs,
          ref: [forwardedRef, elementRef],
          props: [elementProps],
        }
      )}
    </VolumeIndicatorProvider>
  );
});

export namespace VolumeIndicatorRoot {
  export type Props = VolumeIndicatorRootProps;
  export type State = VolumeIndicatorCore.State;
}
