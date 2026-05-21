'use client';

import type { CaptionsMenuCore } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useCaptionsMenuContext } from './context';

export interface CaptionsMenuSectionLabelProps extends UIComponentProps<'span', CaptionsMenuCore.State> {}

export const CaptionsMenuSectionLabel = forwardRef<HTMLSpanElement, CaptionsMenuSectionLabelProps>(
  function CaptionsMenuSectionLabel({ render, className, style, children, ...elementProps }, forwardedRef) {
    const { core, state } = useCaptionsMenuContext();
    const content = children ?? core.getMenuSectionLabel();

    return renderElement(
      'span',
      { render, className, style },
      {
        state,
        ref: [forwardedRef],
        props: [{ ...elementProps, 'data-part': 'section-label', children: content }],
      }
    );
  }
);

export namespace CaptionsMenuSectionLabel {
  export type Props = CaptionsMenuSectionLabelProps;
  export type State = CaptionsMenuCore.State;
}
