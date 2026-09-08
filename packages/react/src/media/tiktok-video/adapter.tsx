'use client';

import { buildTikTokIframeSrc, TikTokAdapter, type TikTokAdapterProps } from '@videojs/tiktok-video';
import { forwardRef, type ReactNode, useState } from 'react';

import { useAttachIframe } from '../../utils/use-attach-iframe';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface TikTokVideoProps extends Partial<TikTokAdapterProps> {
  children?: ReactNode;
}

export const TikTokVideo = forwardRef<HTMLIFrameElement, TikTokVideoProps>(function TikTokVideo(
  { children, ...rawProps },
  ref
) {
  const media = useMediaInstance(TikTokAdapter);
  const props: Partial<TikTokAdapterProps> & Record<string, unknown> = { ...rawProps };
  const attachRef = useAttachIframe(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const [initialSrc] = useState(() =>
    // `source.src` is the only other way to name a video, so honor it when `src` is absent.
    buildTikTokIframeSrc(props.src || props.source?.src || '', {
      ...TikTokAdapter.defaultProps,
      ...props,
      // The frame reads mute once, out of the URL it is rendered with, and either
      // prop says to start muted. Rendering it any other way than the media
      // builds it would have the media rebuild the frame on mount.
      defaultMuted: !!(props.defaultMuted || props.muted),
    })
  );
  const iframeProps = useSyncProps<TikTokAdapterProps, Record<string, unknown>>(
    media,
    props,
    TikTokAdapter.defaultProps
  );

  return (
    <iframe
      title="TikTok video player"
      // Empty means there is no embed to point at yet; React warns about `src=""`,
      // and the media builds the URL itself once a source resolves.
      src={initialSrc || undefined}
      data-cross-origin-frame
      allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      frameBorder={0}
      width="100%"
      height="100%"
      referrerPolicy={props.source?.engine?.tiktok?.referrerPolicy}
      {...iframeProps}
      ref={composedRef}
    >
      {children}
    </iframe>
  );
});

export namespace TikTokVideo {
  export type Props = TikTokVideoProps;
}
