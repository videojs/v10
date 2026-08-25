'use client';

import type { VimeoMediaProps } from '@videojs/media/dom/vimeo';
import { buildVimeoIframeSrc, VimeoMedia, vimeoMediaDefaultProps } from '@videojs/media/dom/vimeo';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef, useState } from 'react';

import { useAttachIframe } from '../../utils/use-attach-iframe';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export type VimeoVideoProps = Partial<VimeoMediaProps> &
  Omit<ComponentPropsWithoutRef<'iframe'>, keyof VimeoMediaProps> & {
    children?: ReactNode;
  };

export const VimeoVideo = forwardRef<HTMLIFrameElement, VimeoVideoProps>(function VimeoVideo(
  { children, ...rawProps },
  ref
) {
  const media = useMediaInstance(VimeoMedia);
  const props = { ...rawProps };
  const attachRef = useAttachIframe(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const [initialSrc] = useState(() =>
    // `source.src` is the only other way to name a video, so honor it when `src` is absent.
    buildVimeoIframeSrc(props.src || props.source?.src || '', { ...vimeoMediaDefaultProps, ...props })
  );
  const iframeProps = useSyncProps<VimeoMediaProps, typeof props>(media, props, vimeoMediaDefaultProps);

  return (
    <iframe
      title="Vimeo video player"
      // Empty means there is no embed to point at yet; React warns about `src=""`,
      // and the media builds the URL itself once a source resolves.
      src={initialSrc || undefined}
      data-cross-origin-frame
      allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      frameBorder={0}
      width="100%"
      height="100%"
      referrerPolicy={props.source?.engine?.vimeo?.referrerPolicy}
      {...iframeProps}
      ref={composedRef}
    >
      {children}
    </iframe>
  );
});

export namespace VimeoVideo {
  export type Props = VimeoVideoProps;
}
