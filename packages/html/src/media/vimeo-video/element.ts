import type { MediaTargetRenderContext } from '@videojs/media/dom';
import { buildVimeoIframeSrc, VimeoAdapter } from '@videojs/vimeo-video';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = ({ adapterProps: props }: MediaTargetRenderContext<typeof VimeoAdapter.defaultProps>): string => {
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
export class VimeoVideoElement extends createMediaElement({
  adapter: { constructor: VimeoAdapter },
  target: iframeTarget(template),
}) {
  static readonly tagName = 'vimeo-video';
}
