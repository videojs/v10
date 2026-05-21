'use client';

import type { PlaybackRateMenuCore } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { usePlaybackRateMenuContext } from './context';

export interface PlaybackRateMenuSectionLabelProps extends UIComponentProps<'span', PlaybackRateMenuCore.State> {}

export const PlaybackRateMenuSectionLabel = forwardRef<HTMLSpanElement, PlaybackRateMenuSectionLabelProps>(
  function PlaybackRateMenuSectionLabel({ render, className, style, children, ...elementProps }, forwardedRef) {
    const { core, state } = usePlaybackRateMenuContext();
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

export namespace PlaybackRateMenuSectionLabel {
  export type Props = PlaybackRateMenuSectionLabelProps;
  export type State = PlaybackRateMenuCore.State;
}
