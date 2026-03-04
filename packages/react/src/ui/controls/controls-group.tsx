'use client';

import type { ControlsCore } from '@videojs/core';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useControlsContext } from './controls-context';

export interface ControlsGroupProps extends UIComponentProps<'div', ControlsCore.State> {
  children?: ReactNode | undefined;
}

/** Layout group for related controls; sets `role="group"` when labeled. */
export const ControlsGroup = forwardRef(function ControlsGroup(
  componentProps: ControlsGroupProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, children, ...elementProps } = componentProps;

  const context = useControlsContext();
  const role = elementProps['aria-label'] || elementProps['aria-labelledby'] ? 'group' : undefined;

  return renderElement(
    'div',
    { render, className, style },
    {
      state: context?.state ?? ({} as ControlsCore.State),
      stateAttrMap: context?.stateAttrMap,
      ref: [forwardedRef],
      props: [{ role, children }, elementProps],
    }
  );
});

export namespace ControlsGroup {
  export type Props = ControlsGroupProps;
}
