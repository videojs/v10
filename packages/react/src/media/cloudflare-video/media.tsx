'use client';

import type { CloudflareMediaProps } from '@videojs/media/dom/cloudflare';
import { buildCloudflareIframeSrc, CloudflareMedia, cloudflareMediaDefaultProps } from '@videojs/media/dom/cloudflare';
import type { ReactNode } from 'react';
import { forwardRef, useState } from 'react';

import { useAttachIframe } from '../../utils/use-attach-iframe';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface CloudflareVideoProps extends Partial<CloudflareMediaProps> {
  children?: ReactNode;
}

export const CloudflareVideo = forwardRef<HTMLIFrameElement, CloudflareVideoProps>(function CloudflareVideo(
  { children, ...rawProps },
  ref
) {
  const media = useMediaInstance(CloudflareMedia);
  const props: Partial<CloudflareMediaProps> & Record<string, unknown> = { ...rawProps };
  const attachRef = useAttachIframe(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const [initialSrc] = useState(() =>
    // `source.src` is the only other way to name a video, so honor it when `src` is absent.
    buildCloudflareIframeSrc(props.src || props.source?.src || '', {
      ...cloudflareMediaDefaultProps,
      ...props,
      // The embed reads mute once, out of the URL it is rendered with, and either
      // prop says to start muted. Leaving `muted` out of the URL would leave a
      // muted autoplay blocked by the browser, since the embed comes up audible.
      defaultMuted: !!(props.defaultMuted || props.muted),
    })
  );
  const iframeProps = useSyncProps<CloudflareMediaProps, Record<string, unknown>>(
    media,
    props,
    cloudflareMediaDefaultProps
  );

  return (
    <iframe
      title="Cloudflare Stream video player"
      // Empty means there is no embed to point at yet; React warns about `src=""`,
      // and the media builds the URL itself once a source resolves.
      src={initialSrc || undefined}
      data-cross-origin-frame
      allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      frameBorder={0}
      width="100%"
      height="100%"
      referrerPolicy={props.source?.engine?.cloudflare?.referrerPolicy}
      {...iframeProps}
      ref={composedRef}
    >
      {children}
    </iframe>
  );
});

export namespace CloudflareVideo {
  export type Props = CloudflareVideoProps;
}
