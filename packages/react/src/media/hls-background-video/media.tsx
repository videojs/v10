'use client';

import {
  HlsBackgroundVideoMedia,
  type HlsBackgroundVideoMediaProps,
  hlsBackgroundVideoMediaDefaultProps,
} from '@videojs/spf/hls-background-video';
import type { VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

// `src` is the only prop the Media owns, taken from the adapter rather than
// restated here so the two can't disagree about what the surface is.
export interface HlsBackgroundVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsBackgroundVideoMediaProps>,
    Partial<HlsBackgroundVideoMediaProps> {}

/**
 * A muted, looping, chrome-less video over the SPF background-video engine — the
 * React counterpart to `<hls-background-video>`, and the replacement for the
 * standalone `mux-background-video` package's component.
 *
 * `src` is an HLS URL and the whole surface. Capping which rendition is fetched
 * is a param on that URL (`?max_resolution=720p` on a Mux stream, for one) rather
 * than a prop, which keeps the renditions it excludes out of the manifest instead
 * of merely unpicked.
 *
 * There is no structured Mux `source`: playback-ID identity, poster, and
 * storyboard belong to `MuxVideo`, since none of them mean anything without
 * controls to hang them on.
 *
 * `MuxBackgroundVideo` is this same component under the name the package it
 * replaces used — an alias, not a variant.
 */
export const HlsBackgroundVideo = forwardRef<HTMLVideoElement, HlsBackgroundVideoProps>(function HlsBackgroundVideo(
  { children, ...props },
  ref
) {
  const media = useMediaInstance(HlsBackgroundVideoMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, hlsBackgroundVideoMediaDefaultProps);

  return (
    // The same set `<hls-background-video>` forces onto its inner video, so the
    // two platforms present the same surface: silent looping playback with no
    // affordance a UA could hang chrome on — AirPlay, Cast, and picture-in-picture
    // all being things a background video has nowhere to put.
    //
    // Applied after the spread rather than before it, unlike the generic
    // `BackgroundVideo`: they're what the component is for, and attaching the
    // Media re-applies its own anyway, so honoring `muted={false}` would only
    // look like it worked.
    <video
      {...htmlProps}
      ref={composedRef}
      muted
      autoPlay
      loop
      playsInline
      disableRemotePlayback
      disablePictureInPicture
    >
      {children}
    </video>
  );
});

export namespace HlsBackgroundVideo {
  export type Props = HlsBackgroundVideoProps;
}
