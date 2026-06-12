'use client';

import { StatusIndicatorCore, StatusIndicatorDataAttrs } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useInputIndicatorRoot } from '../input-indicators/use-input-indicator-root';
import { StatusIndicatorProvider } from './context';

export interface StatusIndicatorRootProps
  extends UIComponentProps<'div', StatusIndicatorCore.State>,
    StatusIndicatorCore.Props {}

export const StatusIndicatorRoot = forwardRef(function StatusIndicatorRoot(
  componentProps: StatusIndicatorRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, actions, closeDelay, labels, ...elementProps } = componentProps;
  const { elementRef, present, state } = useInputIndicatorRoot(() => new StatusIndicatorCore(), {
    actions,
    closeDelay,
    labels,
  });

  if (!present) return null;

  return (
    <StatusIndicatorProvider value={{ state }}>
      {renderElement(
        'div',
        { render, className, style },
        {
          state,
          stateAttrMap: StatusIndicatorDataAttrs,
          ref: [forwardedRef, elementRef],
          props: [elementProps],
        }
      )}
    </StatusIndicatorProvider>
  );
});

export namespace StatusIndicatorRoot {
  export type Props = StatusIndicatorRootProps;
  export type State = StatusIndicatorCore.State;
}
