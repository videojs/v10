import {
  mapCuesToThumbnails,
  ThumbnailCore,
  ThumbnailDataAttrs,
  type ThumbnailFetchPriority,
  type ThumbnailImage,
} from '@videojs/core';
import { createThumbnail, selectTextTrack } from '@videojs/core/dom';
import type { MediaTextTrackState } from '@videojs/media';
import { isNull, isUndefined } from '@videojs/utils/predicate';
import type { CSSProperties } from 'react';
import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useOptionalPlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useDestroy } from '../../utils/use-destroy';
import { useForceRender } from '../../utils/use-force-render';
import { renderElement } from '../../utils/use-render';

// `ThumbnailCore` holds no state, so one shared instance projects every render.
const thumbnailCore = new ThumbnailCore();

export interface ThumbnailProps extends UIComponentProps<'div', ThumbnailCore.State>, ThumbnailCore.Props {
  /** Pre-parsed thumbnail images — bypasses the automatic `<track>` detection. */
  thumbnails?: ThumbnailImage[] | undefined;
}

/**
 * Leaving `crossOrigin` unset means "follow the media element", so thumbnails keep working on a CORS-enabled player
 * without a skin having to thread a prop through. `null` opts out and fetches the sprites no-CORS. `''` is passed
 * straight through, since the CORS-settings attribute reads it as Anonymous.
 *
 * Only the `<track>` path inherits: `thumbnails` passed directly may point at a host that has nothing to do with the
 * media element.
 */
function resolveCrossOrigin(
  explicit: ThumbnailCore.Props['crossOrigin'],
  external: ThumbnailImage[] | undefined,
  inherited: MediaTextTrackState['thumbnailTrackCrossOrigin'] | undefined
) {
  if (isNull(explicit)) return undefined;

  if (!isUndefined(explicit)) return explicit;

  if (external?.length) return undefined;

  return inherited ?? undefined;
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

  const divRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const committedSrcRef = useRef('');
  const textTrack = useOptionalPlayer(selectTextTrack);

  // Re-render when the handle's state changes (img load/error, resize).
  const forceRender = useForceRender();
  const [handle] = useState(() =>
    createThumbnail({
      getContainer: () => divRef.current,
      getImg: () => imgRef.current,
      onStateChange: forceRender,
    })
  );

  useDestroy(handle);

  // Resolve thumbnails: external prop takes priority over auto <track> path.
  const thumbnails = useMemo(() => {
    if (externalThumbnails && externalThumbnails.length > 0) return externalThumbnails;

    return textTrack && textTrack.thumbnailCues.length > 0
      ? mapCuesToThumbnails(textTrack.thumbnailCues, textTrack.thumbnailTrackSrc ?? undefined)
      : [];
  }, [externalThumbnails, textTrack]);

  const thumbnail = useMemo(() => thumbnailCore.findActiveThumbnail(thumbnails, time), [thumbnails, time]);

  const resolvedCrossOrigin = resolveCrossOrigin(crossOrigin, externalThumbnails, textTrack?.thumbnailTrackCrossOrigin);
  const src = thumbnail?.url;

  // Project the requested source during render and publish it to the retained handle only once this render commits,
  // so an abandoned render never restarts loading or rebinds listeners for a source that was never shown.
  const srcPending = (src ?? '') !== committedSrcRef.current;
  const projected = srcPending
    ? { loading: Boolean(src), error: false }
    : { loading: handle.loading, error: handle.error };

  useLayoutEffect(() => {
    handle.updateSrc(src);
    committedSrcRef.current = src ?? '';
    handle.connect();

    // The handle can settle differently from the projection (e.g. a sheet already known to fail), so correct the
    // committed tree before paint.
    if (handle.loading !== projected.loading || handle.error !== projected.error) forceRender();
  });

  const state = thumbnailCore.getState(projected.loading, projected.error, thumbnail);

  // Compute styles declaratively from resize result.
  let containerStyle: CSSProperties = { overflow: 'hidden' };
  let imgStyle: CSSProperties | undefined;

  if (thumbnail && handle.naturalWidth && handle.naturalHeight) {
    const constraints = handle.readConstraints();
    const result = thumbnailCore.resize(thumbnail, handle.naturalWidth, handle.naturalHeight, constraints);

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
        thumbnailCore.getAttrs(state),
        { style: containerStyle },
        elementProps,
        {
          children: (
            <img
              ref={imgRef}
              alt=""
              aria-hidden="true"
              decoding="async"
              src={src}
              crossOrigin={resolvedCrossOrigin}
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
