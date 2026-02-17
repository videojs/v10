'use client';

import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

type GroupState = Record<string, never>;

export interface ControlsGroupProps extends UIComponentProps<'div', GroupState> {
  children?: ReactNode | undefined;
}

/** Layout group for related controls; sets `role="group"` when labeled. */
export const ControlsGroup = forwardRef(function ControlsGroup(
  componentProps: ControlsGroupProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, children, ...elementProps } = componentProps;

  const role = elementProps['aria-label'] || elementProps['aria-labelledby'] ? 'group' : undefined;

  const state: GroupState = {};

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      ref: [forwardedRef],
      props: [{ role, children }, elementProps],
    }
  );
});

export namespace ControlsGroup {
  export type Props = ControlsGroupProps;
}
