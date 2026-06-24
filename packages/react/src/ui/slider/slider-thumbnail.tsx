'use client';

import type { ThumbnailCore } from '@videojs/core';
import { forwardRef } from 'react';

import { Thumbnail, type ThumbnailProps } from '../thumbnail/thumbnail';
import { useSliderContext } from './context';
import { SliderThumbnailRoot, type SliderThumbnailRootProps } from './slider-thumbnail-root';

export interface SliderThumbnailProps extends Omit<ThumbnailProps, 'time'> {}

const SliderThumbnailImage = forwardRef<HTMLDivElement, SliderThumbnailProps>(
  function SliderThumbnail(componentProps, forwardedRef) {
    const { pointerValue } = useSliderContext();
    return <Thumbnail ref={forwardedRef} {...componentProps} time={pointerValue} />;
  }
);

export const SliderThumbnail = Object.assign(SliderThumbnailImage, {
  Root: SliderThumbnailRoot,
  Image: SliderThumbnailImage,
});

export namespace SliderThumbnail {
  export type Props = SliderThumbnailProps;
  export type RootProps = SliderThumbnailRootProps;
  export type ImageProps = SliderThumbnailProps;
  export type State = ThumbnailCore.State;
}
