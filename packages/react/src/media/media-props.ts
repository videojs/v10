import type { Video } from '@videojs/core/media';
import type { VideoHTMLAttributes } from 'react';

interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {}

export function mediaProps(media: Video, props: VideoProps) {
  const { src, ...remainingProps } = props;

  // Preload can still be passed as a prop to the native media element
  if (media.preload !== props.preload) {
    media.preload = props.preload as Video['preload'];
  }

  if (media.src !== src) {
    media.src = src as Video['src'];
  }

  // The remaining props are passed to the native media element
  return remainingProps;
}
