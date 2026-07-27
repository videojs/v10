'use client';

import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import type { HlsMediaProps } from '@videojs/core/dom/media/hls-js';
import { hlsMediaDefaultProps, StreamTypes } from '@videojs/core/dom/media/hls-js';
import { addComponent } from '@videojs/core/dom/media/media-host';
import type { MuxMediaProps } from '@videojs/core/dom/media/mux';
import { MuxData, MuxMedia, muxMediaDefaultProps } from '@videojs/core/dom/media/mux';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef, useCallback, useSyncExternalStore } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface MuxVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsMediaProps | keyof MuxMediaProps>,
    Partial<HlsMediaProps>,
    Partial<MuxMediaProps> {
  children?: ReactNode;
}

const muxVideoDefaultProps: HlsMediaProps & MuxMediaProps = { ...hlsMediaDefaultProps, ...muxMediaDefaultProps };

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo({ children, ...props }, ref) {
  const media = useMediaInstance(MuxMedia, (media) => {
    addComponent(media, new MuxData({ playerSoftwareName: 'mux-video' }));
    addComponent(media, new GoogleCast());
  });
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, muxVideoDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      <MuxStoryboard media={media} />
      {children}
    </video>
  );
});

export namespace MuxVideo {
  export type Props = MuxVideoProps;
}

// Renders the storyboard (thumbnail) track derived from the media `source`.
// Kept as its own component so runtime media changes (stream type detection,
// source swaps) re-render the track instead of the whole media component.
function MuxStoryboard({ media }: { media: MuxMedia }) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      media.addEventListener('streamtypechange', onChange);
      media.addEventListener('sourcechange', onChange);
      return () => {
        media.removeEventListener('streamtypechange', onChange);
        media.removeEventListener('sourcechange', onChange);
      };
    },
    [media]
  );

  // The stream type is detected at runtime and live streams have no storyboard.
  const getSnapshot = () => (media.streamType === StreamTypes.LIVE ? '' : media.storyboard);
  const src = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!src) return null;
  return <track kind="metadata" label="thumbnails" src={src} default />;
}
