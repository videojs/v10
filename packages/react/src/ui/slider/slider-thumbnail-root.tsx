'use client';

import type { SliderState } from '@videojs/core';

import type { UIComponentProps } from '../../utils/types';
import { createContextPart } from '../create-context-part';
import { useSliderContext } from './context';

export interface SliderThumbnailRootProps extends UIComponentProps<'div', SliderState> {}

export const SliderThumbnailRoot = createContextPart<SliderThumbnailRootProps, SliderState>({
  displayName: 'SliderThumbnailRoot',
  tag: 'div',
  useContext: useSliderContext,
});

export namespace SliderThumbnailRoot {
  export type Props = SliderThumbnailRootProps;
}
