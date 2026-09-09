import type { ThumbnailCore } from '@videojs/core';
import { forwardRef } from 'react';

import { Thumbnail } from '../thumbnail';
import type { ThumbnailImageProps } from '../thumbnail/thumbnail-image';
import type { ThumbnailRootProps } from '../thumbnail/thumbnail-root';
import { useSliderPointerValue } from './context';

export interface SliderThumbnailProps
  extends Omit<ThumbnailRootProps, 'time'>, Pick<ThumbnailImageProps, 'crossOrigin' | 'fetchPriority' | 'loading'> {}

export const SliderThumbnail = forwardRef<HTMLDivElement, SliderThumbnailProps>(
  function SliderThumbnail(componentProps, forwardedRef) {
    const pointerValue = useSliderPointerValue();
    const { crossOrigin, fetchPriority, loading, children, ...rootProps } = componentProps;

    // Children are sibling layers beside the controlled image, as on `Thumbnail.Root`.
    return (
      <Thumbnail.Root ref={forwardedRef} {...rootProps} time={pointerValue}>
        <Thumbnail.Image crossOrigin={crossOrigin} fetchPriority={fetchPriority} loading={loading} />
        {children}
      </Thumbnail.Root>
    );
  }
);

export namespace SliderThumbnail {
  export type Props = SliderThumbnailProps;
  export type State = ThumbnailCore.State;
}
