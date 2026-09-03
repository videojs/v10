import type { ThumbnailCore } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import { ThumbnailRoot, type ThumbnailRootProps } from '../thumbnail/thumbnail-root';
import { useSliderPointerValue } from './context';

export interface SliderThumbnailRootProps extends Omit<ThumbnailRootProps, 'time'> {}

export const SliderThumbnailRoot = forwardRef(function SliderThumbnailRoot(
  componentProps: SliderThumbnailRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const pointerValue = useSliderPointerValue();

  return <ThumbnailRoot ref={forwardedRef} {...componentProps} time={pointerValue} />;
});

export namespace SliderThumbnailRoot {
  export type Props = SliderThumbnailRootProps;
  export type State = ThumbnailCore.State;
}
