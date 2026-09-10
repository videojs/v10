import { propsFromAttributes } from '@videojs/media/dom';
import { buildVimeoIframeSrc, VimeoAdapter } from '@videojs/vimeo-video';

import { createMediaElement, iframeHost } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = (attrs: Record<string, string>): string => {
  const props = propsFromAttributes(VimeoAdapter, attrs);

  return embedTemplate({
    src: buildVimeoIframeSrc(props.src, props),
    allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture',
    attributes: { allowfullscreen: '' },
  });
};

/**
 * @mediaType video
 * @mediaTarget iframe
 */
export class VimeoVideoElement extends createMediaElement({ Adapter: VimeoAdapter, host: iframeHost(template) }) {
  static readonly tagName = 'vimeo-video';
}
