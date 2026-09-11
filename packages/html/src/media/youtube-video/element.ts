import { propsFromAttributes } from '@videojs/media/dom';
import { buildYouTubeIframeSrc, YouTubeAdapter } from '@videojs/youtube-video';

import { createMediaElement, iframeHost } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = (attrs: Record<string, string>): string => {
  const props = propsFromAttributes(YouTubeAdapter, attrs);

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
export class YouTubeVideoElement extends createMediaElement({ Adapter: YouTubeAdapter, host: iframeHost(template) }) {
  static readonly tagName = 'youtube-video';
}
