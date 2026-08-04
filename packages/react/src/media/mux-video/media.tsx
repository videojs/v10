'use client';

import type { HlsMediaProps } from '@videojs/media/dom/hls-js';
import { hlsMediaDefaultProps, StreamTypes } from '@videojs/media/dom/hls-js';
import type { MuxMediaProps } from '@videojs/media/dom/mux';
import { MuxMedia, muxMediaDefaultProps } from '@videojs/media/dom/mux';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef, useCallback, useSyncExternalStore } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

// `source` comes from `MuxMediaProps` only: `MuxSource` extends `HlsSource` with
// Mux identity fields, so the narrower type has to win.
export interface MuxVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsMediaProps | keyof MuxMediaProps>,
    Partial<Omit<HlsMediaProps, 'source'>>,
    Partial<MuxMediaProps> {
  children?: ReactNode;
}

const muxVideoDefaultProps: Omit<HlsMediaProps, 'source'> & MuxMediaProps = {
  ...hlsMediaDefaultProps,
  ...muxMediaDefaultProps,
};

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo({ children, ...props }, ref) {
  const media = useMediaInstance(MuxMedia);
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

// Renders the storyboard track in its own component so media changes don't re-render the whole media component.
function MuxStoryboard({ media }: { media: MuxMedia }) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // `useSyncProps` writes `src` / `source` during render and those setters
      // dispatch `sourcechange` synchronously. Defer (and coalesce) notifications
      // so we never schedule an update while another component is rendering.
      let cancelled = false;
      let scheduled = false;
      const notify = () => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          if (!cancelled) onChange();
        });
      };
      media.addEventListener('streamtypechange', notify);
      media.addEventListener('sourcechange', notify);
      return () => {
        cancelled = true;
        media.removeEventListener('streamtypechange', notify);
        media.removeEventListener('sourcechange', notify);
      };
    },
    [media]
  );

  // The stream type is detected at runtime and live streams have no storyboard.
  // The '' fallback keeps the snapshot a string rather than sometimes undefined.
  const getSnapshot = () => (media.streamType === StreamTypes.LIVE ? '' : (media.contentData.storyboard ?? ''));
  const src = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!src) return null;
  return <track kind="metadata" label="thumbnails" src={src} default />;
}
