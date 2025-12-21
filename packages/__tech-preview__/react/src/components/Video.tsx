import type {
  CSSProperties,
  DetailedHTMLProps,
  PropsWithChildren,
  VideoHTMLAttributes,
} from 'react';

import React, { forwardRef } from 'react';
import { useMediaRef } from '@/store';

export type VideoProps = PropsWithChildren<
  DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> & {
    className?: string | undefined;
    style?: CSSProperties | undefined;
  }
>;

/**
 * Video - A basic video component that works with native HTML5 video formats (MP4, WebM, etc.)
 * without using a playback engine. Use this for simple MP4 files. For HLS/DASH streaming, use the
 * regular Video component instead.
 *
 * This component connects to VideoProvider for play/pause state but sets the src directly on the
 * video element without going through HLS.js or other playback engines.
 *
 * @example
 * ```tsx
 * <VideoProvider>
 *   <MediaSkin>
 *     <Video src="video.mp4" />
 *   </MediaSkin>
 * </VideoProvider>
 * ```
 */
export const Video: React.ForwardRefExoticComponent<
  VideoProps & React.RefAttributes<HTMLVideoElement>
> = forwardRef<HTMLVideoElement, VideoProps>(
  ({ children, ...props }, _ref) => {
    const mediaRefCallback = useMediaRef();

    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video {...props} ref={mediaRefCallback}>
        {children}
      </video>
    );
  },
);

Video.displayName = 'Video';

export default Video;
