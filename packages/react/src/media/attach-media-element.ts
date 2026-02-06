import type { HlsMedia } from '@videojs/core/media';

export function attachMediaElement<T extends HTMLVideoElement>(media: HlsMedia): (element: T | null) => void {
  return (element: T | null) => {
    if (element) {
      media.attach(element);
    } else {
      media.detach();
    }
    // React 19+ accepts a cleanup function as the return value
    return () => media.detach();
  };
}
