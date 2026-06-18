'use client';

import type { VimeoMediaProps } from '@videojs/core/dom/media/vimeo';
import { buildVimeoIframeSrc, VimeoMedia, vimeoMediaDefaultProps } from '@videojs/core/dom/media/vimeo';
import type { ReactNode } from 'react';
import { forwardRef, useState } from 'react';
import { useAttachIframe } from '../../utils/use-attach-iframe';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface VimeoVideoProps extends Partial<VimeoMediaProps> {
  children?: ReactNode;
}

export const VimeoVideo = forwardRef<HTMLIFrameElement, VimeoVideoProps>(function VimeoVideo(
  { children, ...rawProps },
  ref
) {
  const media = useMediaInstance(VimeoMedia);
  const props: Partial<VimeoMediaProps> & Record<string, unknown> = { ...rawProps };
  const attachRef = useAttachIframe(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const [initialSrc] = useState(() => buildVimeoIframeSrc(props.src ?? '', { ...vimeoMediaDefaultProps, ...props }));
  const iframeProps = useSyncProps<VimeoMediaProps, Record<string, unknown>>(media, props, vimeoMediaDefaultProps);

  return (
    <iframe
      title="Vimeo video player"
      src={initialSrc}
      data-cross-origin-frame
      allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      frameBorder={0}
      width="100%"
      height="100%"
      referrerPolicy={props.config?.referrerPolicy}
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
