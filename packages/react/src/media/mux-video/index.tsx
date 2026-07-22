'use client';

import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import type { HlsMediaProps } from '@videojs/core/dom/media/hls-js';
import { hlsMediaDefaultProps, StreamTypes } from '@videojs/core/dom/media/hls-js';
import { addComponent } from '@videojs/core/dom/media/media-host';
import type { MuxMediaProps } from '@videojs/core/dom/media/mux';
import { getStoryboardURLFromPlaybackId, MuxData, MuxMedia, muxMediaDefaultProps } from '@videojs/core/dom/media/mux';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef, useEffect, useState } from 'react';
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

  // Stream type is detected at runtime; track it so live streams skip storyboards.
  const [streamType, setStreamType] = useState(() => media.streamType);
  useEffect(() => {
    const sync = () => setStreamType(media.streamType);
    sync();
    media.addEventListener('streamtypechange', sync);
    return () => media.removeEventListener('streamtypechange', sync);
  }, [media]);

  // Infer the storyboard (thumbnail) track from the playback ID, except for live.
  const storyboardSrc =
    streamType === StreamTypes.LIVE
      ? undefined
      : getStoryboardURLFromPlaybackId(props.playbackId, { customDomain: props.customDomain });

  return (
    <video ref={composedRef} {...htmlProps}>
      {storyboardSrc && <track kind="metadata" label="thumbnails" src={storyboardSrc} default />}
      {children}
    </video>
  );
});

export namespace MuxVideo {
  export type Props = MuxVideoProps;
}
