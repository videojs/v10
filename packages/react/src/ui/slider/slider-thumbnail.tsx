import type { ThumbnailCore } from '@videojs/core';
import { forwardRef } from 'react';

import { Thumbnail, type ThumbnailProps } from '../thumbnail/thumbnail';
import { useSliderPointerValue } from './context';

export interface SliderThumbnailProps extends Omit<ThumbnailProps, 'time'> {}

export const SliderThumbnail = forwardRef<HTMLDivElement, SliderThumbnailProps>(
  function SliderThumbnail(componentProps, forwardedRef) {
    const pointerValue = useSliderPointerValue();

    return <Thumbnail ref={forwardedRef} {...componentProps} time={pointerValue} />;
  }
);

export namespace SliderThumbnail {
  export type Props = SliderThumbnailProps;
  export type State = ThumbnailCore.State;
}
