import type { ThumbnailCore, ThumbnailFetchPriority } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useThumbnailContext } from './context';

export interface ThumbnailImageProps extends UIComponentProps<'img', ThumbnailCore.State> {}

export const ThumbnailImage = forwardRef(function ThumbnailImage(
  componentProps: ThumbnailImageProps,
  forwardedRef: ForwardedRef<HTMLImageElement>
) {
  const { render, className, style, ...elementProps } = componentProps;
  const { fetchPriority, imgRef, imgStyle, loading, resolvedCrossOrigin, state, thumbnail } = useThumbnailContext();

  return renderElement(
    'img',
    { render, className, style },
    {
      state,
      ref: [forwardedRef, imgRef],
      props: [
        {
          alt: '',
          'aria-hidden': 'true',
          crossOrigin: resolvedCrossOrigin,
          decoding: 'async',
          fetchPriority: fetchPriority as ThumbnailFetchPriority,
          loading,
          src: thumbnail?.url,
          style: imgStyle,
        },
        elementProps,
      ],
    }
  );
});

export namespace ThumbnailImage {
  export type Props = ThumbnailImageProps;
}
