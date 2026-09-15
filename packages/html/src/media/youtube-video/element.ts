import { buildYouTubeIframeSrc, YouTubeAdapter } from '@videojs/youtube-video';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

/**
 * @mediaType video
 * @mediaTarget iframe
 */
export class YouTubeVideoElement extends createMediaElement({
  adapter: { constructor: YouTubeAdapter },
  target: iframeTarget,
  template: ({ adapterProps: props }) =>
    embedTemplate({
      src: buildYouTubeIframeSrc(props.src, props),
      allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture',
      attributes: { allowfullscreen: '' },
    }),
}) {
  static readonly tagName = 'youtube-video';
}
