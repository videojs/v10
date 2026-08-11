'use client';

import {
  MuxBackgroundVideoMedia,
  type MuxBackgroundVideoMediaProps,
  muxBackgroundVideoMediaDefaultProps,
} from '@videojs/spf/mux-background-video';
import type { VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

// `src` is the only prop the Media owns, taken from the adapter rather than
// restated here so the two can't disagree about what the surface is.
export interface MuxBackgroundVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof MuxBackgroundVideoMediaProps>,
    Partial<MuxBackgroundVideoMediaProps> {}

/**
 * A muted, looping, chrome-less video over the SPF background-video engine — the
 * React counterpart to `<mux-background-video>`, and the replacement for the
 * standalone `mux-background-video` package's component.
 *
 * `src` is an HLS URL and the whole surface. Capping which rendition is fetched
 * is a Mux URL param (`?max_resolution=720p`) rather than a prop, which keeps
 * the renditions it excludes out of the manifest instead of merely unpicked.
 *
 * There is no structured Mux `source`: playback-ID identity, poster, and
 * storyboard belong to `MuxVideo`, since none of them mean anything without
 * controls to hang them on.
 */
export const MuxBackgroundVideo = forwardRef<HTMLVideoElement, MuxBackgroundVideoProps>(function MuxBackgroundVideo(
  { children, ...props },
  ref
) {
  const media = useMediaInstance(MuxBackgroundVideoMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, muxBackgroundVideoMediaDefaultProps);

  return (
    // Applied after the spread rather than before it: unlike the generic
    // `BackgroundVideo`, these four aren't overridable. They're what the
    // component is for, and attaching the Media re-applies them anyway, so
    // letting a caller pass `muted={false}` would only look honored.
    <video {...htmlProps} ref={composedRef} muted autoPlay loop playsInline>
      {children}
    </video>
  );
});

export namespace MuxBackgroundVideo {
  export type Props = MuxBackgroundVideoProps;
}
