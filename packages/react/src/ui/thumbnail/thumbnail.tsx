'use client';

import { mapCuesToThumbnails, type ThumbnailConstraints, ThumbnailCore, ThumbnailDataAttrs } from '@videojs/core';
import { selectTextTrack } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

function parseConstraints(computed: CSSStyleDeclaration): ThumbnailConstraints {
  const minW = parseFloat(computed.minWidth);
  const maxW = parseFloat(computed.maxWidth);
  const minH = parseFloat(computed.minHeight);
  const maxH = parseFloat(computed.maxHeight);

  return {
    minWidth: Number.isFinite(minW) ? minW : 0,
    maxWidth: Number.isFinite(maxW) ? maxW : Infinity,
    minHeight: Number.isFinite(minH) ? minH : 0,
    maxHeight: Number.isFinite(maxH) ? maxH : Infinity,
  };
}

export interface ThumbnailProps extends UIComponentProps<'div', ThumbnailCore.State> {
  time?: number | undefined;
}

export const Thumbnail = forwardRef(function Thumbnail(
  componentProps: ThumbnailProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, time = 0, ...elementProps } = componentProps;

  const [core] = useState(() => new ThumbnailCore());
  const divRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const textTrack = usePlayer(selectTextTrack);

  const thumbnails = useMemo(() => {
    if (!textTrack?.thumbnailCues.length) return [];
    return mapCuesToThumbnails(textTrack.thumbnailCues, textTrack.thumbnailTrackSrc ?? undefined);
  }, [textTrack]);

  const thumbnail = useMemo(() => core.findActiveThumbnail(thumbnails, time), [core, thumbnails, time]);

  // Track image natural dimensions — updated on each load event.
  const [imgNatural, setImgNatural] = useState<[width: number, height: number] | null>(null);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNatural([img.naturalWidth, img.naturalHeight]);
  }, []);

  const state = core.getState(false, false, thumbnail);

  // Read CSS constraints and apply resize imperatively before paint.
  useLayoutEffect(() => {
    const div = divRef.current;
    const img = imgRef.current;

    if (!div || !img || !thumbnail || !imgNatural) {
      if (div) {
        div.style.width = '';
        div.style.height = '';
      }

      if (img) {
        img.style.width = '';
        img.style.height = '';
        img.style.transform = '';
        img.style.maxWidth = '';
      }

      return;
    }

    const constraints = parseConstraints(getComputedStyle(div));
    const result = core.resize(thumbnail, imgNatural[0], imgNatural[1], constraints);

    if (!result) return;

    div.style.width = `${result.containerWidth}px`;
    div.style.height = `${result.containerHeight}px`;

    img.style.width = `${result.imageWidth}px`;
    img.style.height = `${result.imageHeight}px`;
    img.style.maxWidth = 'none';
    img.style.transform =
      result.offsetX || result.offsetY ? `translate(-${result.offsetX}px, -${result.offsetY}px)` : '';

    return () => {
      div.style.width = '';
      div.style.height = '';
      img.style.width = '';
      img.style.height = '';
      img.style.transform = '';
      img.style.maxWidth = '';
    };
  }, [core, thumbnail, imgNatural]);

  const imgProps: React.ImgHTMLAttributes<HTMLImageElement> = {
    alt: '',
    'aria-hidden': 'true',
    decoding: 'async',
  };

  if (thumbnail) {
    imgProps.src = thumbnail.url;
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
        { style: { overflow: 'hidden' } },
        elementProps,
        { children: <img ref={imgRef} alt="" onLoad={handleImgLoad} {...imgProps} /> },
      ],
    }
  );
});

export namespace Thumbnail {
  export type Props = ThumbnailProps;
  export type State = ThumbnailCore.State;
}
