import { buildVimeoIframeSrc, VimeoAdapter } from '@videojs/vimeo-video';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

/**
 * @mediaType video
 * @mediaTarget iframe
 */
export class VimeoVideoElement extends createMediaElement({
  adapter: { constructor: VimeoAdapter },
  target: iframeTarget,
  template: ({ adapterProps: props }) =>
    embedTemplate({
      src: buildVimeoIframeSrc(props.src, props),
      allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture',
      attributes: { allowfullscreen: '' },
    }),
}) {
  static readonly tagName = 'vimeo-video';
}
