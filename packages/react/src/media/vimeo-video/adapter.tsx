'use client';

import { buildVimeoIframeSrc, VimeoAdapter } from '@videojs/vimeo-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type VimeoVideoProps = MediaComponentProps<typeof VimeoAdapter>;

export const VimeoVideo = createMediaComponent(
  VimeoAdapter,
  ({ adapter, props, children, ref, initialProps }) => {
    const initialSrc =
      // `source.src` is the only other way to name a video, so honor it when `src` is absent.
      buildVimeoIframeSrc(initialProps.src || initialProps.source?.src || '', {
        ...VimeoAdapter.defaultProps,
        ...initialProps,
      });

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
        referrerPolicy={adapter.source?.engine?.vimeo?.referrerPolicy}
        {...props}
        ref={ref}
      >
        {children}
      </iframe>
    );
  },
  { displayName: 'VimeoVideo' }
);

export namespace VimeoVideo {
  export type Props = VimeoVideoProps;
}
