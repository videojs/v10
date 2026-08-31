import { mapCuesToThumbnails, ThumbnailCore, ThumbnailDataAttrs } from '@videojs/core';
import { createThumbnail, selectTextTrack } from '@videojs/core/dom';
import type { CSSProperties, ForwardedRef } from 'react';
import { forwardRef, useMemo, useRef, useState } from 'react';

import { useOptionalPlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useDestroy } from '../../utils/use-destroy';
import { renderElement } from '../../utils/use-render';
import { ThumbnailProvider } from './context';

export interface ThumbnailRootProps extends UIComponentProps<'div', ThumbnailCore.State>, ThumbnailCore.RootProps {}

/**
 * Resolves, sizes, and clips a thumbnail for a point in time.
 *
 * Renders a `div` and exposes `data-hidden`, `data-loading`, and `data-error` for styling every layer in the preview.
 * Render `Thumbnail.Img` inside it for the image the root controls and measures.
 */
export const ThumbnailRoot = forwardRef(function ThumbnailRoot(
  componentProps: ThumbnailRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, time = 0, thumbnails: externalThumbnails, ...elementProps } = componentProps;

  const [core] = useState(() => new ThumbnailCore());
  const divRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const textTrack = useOptionalPlayer(selectTextTrack);

  // Force a render when the image loads, fails, or the root is resized.
  const [, setRenderToken] = useState(0);
  const [handle] = useState(() =>
    createThumbnail({
      getContainer: () => divRef.current,
      getImg: () => imgRef.current,
      onStateChange: () => setRenderToken((token) => token + 1),
    })
  );

  useDestroy(handle, () => handle.connect());

  // A supplied list takes priority over automatic <track> detection.
  const thumbnails = useMemo(() => {
    if (externalThumbnails && externalThumbnails.length > 0) return externalThumbnails;

    return textTrack && textTrack.thumbnailCues.length > 0
      ? mapCuesToThumbnails(textTrack.thumbnailCues, textTrack.thumbnailTrackSrc ?? undefined)
      : [];
  }, [externalThumbnails, textTrack]);

  const thumbnail = useMemo(() => core.findActiveThumbnail(thumbnails, time), [core, thumbnails, time]);

  handle.updateSrc(thumbnail?.url);

  const state = core.getState(handle.loading, handle.error, thumbnail);

  let containerStyle: CSSProperties = { overflow: 'hidden' };
  let imageStyle: CSSProperties | undefined;

  if (thumbnail && handle.naturalWidth && handle.naturalHeight) {
    const constraints = handle.readConstraints();
    const result = core.resize(thumbnail, handle.naturalWidth, handle.naturalHeight, constraints);

    if (result) {
      containerStyle = {
        overflow: 'hidden',
        width: result.containerWidth,
        height: result.containerHeight,
      };
      imageStyle = {
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
        state,
        src: thumbnail?.url,
        imageStyle,
        thumbnailTrackCrossOrigin: textTrack?.thumbnailTrackCrossOrigin ?? undefined,
        inheritsCrossOrigin: !externalThumbnails?.length,
        imageRef: imgRef,
        connectImage: handle.connect,
        disconnectImage: handle.disconnectImg,
      }}
    >
      {renderElement(
        'div',
        { render, className, style },
        {
          state,
          stateAttrMap: ThumbnailDataAttrs,
          ref: [forwardedRef, divRef],
          props: [core.getAttrs(state), { style: containerStyle }, elementProps],
        }
      )}
    </ThumbnailProvider>
  );
});

export namespace ThumbnailRoot {
  export type Props = ThumbnailRootProps;
  export type State = ThumbnailCore.State;
}
