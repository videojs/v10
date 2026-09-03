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
import type { CSSProperties, ForwardedRef } from 'react';
import { forwardRef, useMemo, useRef, useState } from 'react';

import { useOptionalPlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useDestroy } from '../../utils/use-destroy';
import { renderElement } from '../../utils/use-render';
import { ThumbnailProvider } from './context';
import { ThumbnailImage as ThumbnailImagePart } from './thumbnail-image';

export interface ThumbnailRootProps extends UIComponentProps<'div', ThumbnailCore.State>, ThumbnailCore.Props {
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

export const ThumbnailRoot = forwardRef(function ThumbnailRoot(
  componentProps: ThumbnailRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const {
    render,
    className,
    style,
    children,
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

  const textTrack = useOptionalPlayer(selectTextTrack);

  // Force re-render when the handle's state changes (img load/error, resize).
  const [, setRenderToken] = useState(0);

  const [handle] = useState(() =>
    createThumbnail({
      getContainer: () => divRef.current,
      getImg: () => imgRef.current,
      onStateChange: () => setRenderToken((n) => n + 1),
    })
  );

  useDestroy(handle, () => handle.connect());

  // Resolve thumbnails: external prop takes priority over auto <track> path.
  const thumbnails = useMemo(() => {
    if (externalThumbnails && externalThumbnails.length > 0) return externalThumbnails;

    return textTrack && textTrack.thumbnailCues.length > 0
      ? mapCuesToThumbnails(textTrack.thumbnailCues, textTrack.thumbnailTrackSrc ?? undefined)
      : [];
  }, [externalThumbnails, textTrack]);

  const thumbnail = useMemo(() => core.findActiveThumbnail(thumbnails, time), [core, thumbnails, time]);

  const resolvedCrossOrigin = resolveCrossOrigin(crossOrigin, externalThumbnails, textTrack?.thumbnailTrackCrossOrigin);

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

  return (
    <ThumbnailProvider
      value={{
        fetchPriority: fetchPriority as ThumbnailFetchPriority | undefined,
        imgRef,
        imgStyle,
        loading,
        resolvedCrossOrigin,
        state,
        thumbnail,
      }}
    >
      {renderElement(
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
              children: children ?? <ThumbnailImagePart />,
            },
          ],
        }
      )}
    </ThumbnailProvider>
  );
});

export namespace ThumbnailRoot {
  export type Props = ThumbnailRootProps;
  export type State = ThumbnailCore.State;
}
