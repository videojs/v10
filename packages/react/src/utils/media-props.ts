import type { VideoApi } from '@videojs/core/dom';
import type { VideoHTMLAttributes } from 'react';

interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {}

export function mediaProps(media: VideoApi, props: VideoProps) {
  const { src, ...remainingProps } = props;

  // Preload can still be passed as a prop to the native media element
  if (props.preload && media.preload !== props.preload) {
    media.preload = props.preload as VideoApi['preload'];
  }

  if (media.src !== src) {
    media.src = src ?? '';
  }

  // The remaining props are passed to the native media element
  return remainingProps;
}
