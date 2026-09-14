import { adapterPropsFromAttributes } from '@videojs/media/dom';
import { buildVimeoIframeSrc, VimeoAdapter } from '@videojs/vimeo-video';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = (attrs: Record<string, string>): string => {
  const props = adapterPropsFromAttributes(VimeoAdapter, attrs);

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
export class VimeoVideoElement extends createMediaElement({ Adapter: VimeoAdapter, target: iframeTarget(template) }) {
  static readonly tagName = 'vimeo-video';
}
