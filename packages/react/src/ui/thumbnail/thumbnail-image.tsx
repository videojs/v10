import type { ThumbnailCore, ThumbnailFetchPriority } from '@videojs/core';
import type { MediaTextTrackState } from '@videojs/media';
import { isNull, isUndefined } from '@videojs/utils/predicate';
import type { ForwardedRef } from 'react';
import { forwardRef, useLayoutEffect } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useThumbnailContext } from './context';

export interface ThumbnailImageProps extends Omit<
  UIComponentProps<'img', ThumbnailCore.State>,
  'crossOrigin' | 'fetchPriority' | 'loading' | 'src'
> {
  /** CORS setting for the selected image. Leave unset to follow the media element, or pass `null` to opt out. */
  crossOrigin?: ThumbnailCore.ImageProps['crossOrigin'];
  /** Image loading strategy. */
  loading?: ThumbnailCore.ImageProps['loading'];
  /** Image fetch priority hint. */
  fetchPriority?: ThumbnailCore.ImageProps['fetchPriority'];
}

function resolveCrossOrigin(
  explicit: ThumbnailCore.ImageProps['crossOrigin'],
  inherits: boolean,
  inherited: MediaTextTrackState['thumbnailTrackCrossOrigin'] | undefined
) {
  if (isNull(explicit)) return undefined;

  if (!isUndefined(explicit)) return explicit;

  return inherits ? (inherited ?? undefined) : undefined;
}

/**
 * Displays the image selected and measured by `Thumbnail.Root`.
 *
 * Renders an `img`, so native image attributes and the `render` escape hatch remain available without replacing the
 * root that owns thumbnail state.
 */
export const ThumbnailImage = forwardRef(function ThumbnailImage(
  componentProps: ThumbnailImageProps,
  forwardedRef: ForwardedRef<HTMLImageElement>
) {
  const { render, className, style, crossOrigin, loading, fetchPriority, ...elementProps } = componentProps;
  const {
    state,
    src,
    imageStyle,
    thumbnailTrackCrossOrigin,
    inheritsCrossOrigin,
    imageRef,
    connectImage,
    disconnectImage,
  } = useThumbnailContext();

  const resolvedCrossOrigin = resolveCrossOrigin(crossOrigin, inheritsCrossOrigin, thumbnailTrackCrossOrigin);

  useLayoutEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    connectImage();

    return () => disconnectImage(img);
  }, [connectImage, disconnectImage, imageRef, render]);

  return renderElement(
    'img',
    { render, className, style },
    {
      state,
      ref: [forwardedRef, imageRef],
      props: [
        { alt: '', 'aria-hidden': 'true', decoding: 'async' },
        elementProps,
        {
          src,
          crossOrigin: resolvedCrossOrigin,
          loading,
          style: imageStyle,
          // SAFETY: The core and React types contain the same fetch-priority literals; React alone omits `undefined`.
          fetchPriority: fetchPriority as ThumbnailFetchPriority,
        },
      ],
    }
  );
});

export namespace ThumbnailImage {
  export type Props = ThumbnailImageProps;
}
