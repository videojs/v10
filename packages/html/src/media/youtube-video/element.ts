import type { MediaTargetRenderContext } from '@videojs/media/dom';
import { buildYouTubeIframeSrc, YouTubeAdapter } from '@videojs/youtube-video';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = ({ adapterProps: props }: MediaTargetRenderContext<typeof YouTubeAdapter.defaultProps>): string => {
  return embedTemplate({
    src: buildYouTubeIframeSrc(props.src, props),
    allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture',
    attributes: { allowfullscreen: '' },
  });
};

/**
 * @mediaType video
 * @mediaTarget iframe
 */
export class YouTubeVideoElement extends createMediaElement({
  adapter: { constructor: YouTubeAdapter },
  target: iframeTarget(template),
}) {
  static readonly tagName = 'youtube-video';
}
