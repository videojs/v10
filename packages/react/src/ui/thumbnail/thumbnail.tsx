'use client';

import {
  mapCuesToThumbnails,
  ThumbnailCore,
  ThumbnailDataAttrs,
  type ThumbnailFetchPriority,
  type ThumbnailImage,
} from '@videojs/core';
import { createThumbnail, selectTextTrack } from '@videojs/core/dom';
import type { CSSProperties } from 'react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

export interface ThumbnailProps extends UIComponentProps<'div', ThumbnailCore.State>, ThumbnailCore.Props {
  /** Pre-parsed thumbnail images — bypasses the automatic `<track>` detection. */
  thumbnails?: ThumbnailImage[] | undefined;
}

export const Thumbnail = forwardRef<HTMLDivElement, ThumbnailProps>(function Thumbnail(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    time = 0,
    thumbnails: externalThumbnails,
    crossOrigin,
    loading,
    fetchPriority,
    ...elementProps
  } = componentProps;

  const [core] = useState(() => new ThumbnailCore());
  const divRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const textTrack = usePlayer(selectTextTrack);

  // Force re-render when the handle's state changes (img load/error, resize).
  const [, setRenderToken] = useState(0);

  const [handle] = useState(() =>
    createThumbnail({
      getContainer: () => divRef.current,
      getImg: () => imgRef.current,
      onStateChange: () => setRenderToken((n) => n + 1),
    })
  );

  useEffect(() => {
    handle.connect();
    return () => handle.destroy();
  }, [handle]);

  // Resolve thumbnails: external prop takes priority over auto <track> path.
  const thumbnails = useMemo(() => {
    if (externalThumbnails && externalThumbnails.length > 0) return externalThumbnails;
    if (!textTrack?.thumbnailCues.length) return [];
    return mapCuesToThumbnails(textTrack.thumbnailCues, textTrack.thumbnailTrackSrc ?? undefined);
  }, [externalThumbnails, textTrack]);

  const thumbnail = useMemo(() => core.findActiveThumbnail(thumbnails, time), [core, thumbnails, time]);

  // Track src changes via the handle.
  handle.updateSrc(thumbnail?.url);

  const state = core.getState(handle.loading, handle.error, thumbnail);

  // Compute styles declaratively from resize result.
  let containerStyle: CSSProperties = { overflow: 'hidden' };
  let imgStyle: CSSProperties | undefined;

  if (thumbnail && handle.naturalWidth && handle.naturalHeight) {
    const constraints = handle.readConstraints();
    const result = core.resize(thumbnail, handle.naturalWidth, handle.naturalHeight, constraints);

    if (result) {
      containerStyle = {
        overflow: 'hidden',
        width: result.containerWidth,
        height: result.containerHeight,
      };
      imgStyle = {
        width: result.imageWidth,
        height: result.imageHeight,
        maxWidth: 'none',
        transform:
          result.offsetX || result.offsetY ? `translate(-${result.offsetX}px, -${result.offsetY}px)` : undefined,
      };
    }
  }

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap: ThumbnailDataAttrs,
      ref: [forwardedRef, divRef],
      props: [
        core.getAttrs(state),
        { style: containerStyle },
        elementProps,
        {
          children: (
            <img
              ref={imgRef}
              alt=""
              aria-hidden="true"
              decoding="async"
              src={thumbnail?.url}
              crossOrigin={crossOrigin === '' || crossOrigin === null ? undefined : crossOrigin}
              loading={loading}
              style={imgStyle}
              // React's types omit `| undefined` from fetchPriority — cast to satisfy exactOptionalPropertyTypes.
              fetchPriority={fetchPriority as ThumbnailFetchPriority}
            />
          ),
        },
      ],
    }
  );
});

export namespace Thumbnail {
  export type Props = ThumbnailProps;
  export type State = ThumbnailCore.State;
}
