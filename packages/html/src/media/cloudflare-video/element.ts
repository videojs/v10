import { buildCloudflareIframeSrc, CloudflareAdapter } from '@videojs/cloudflare-video';
import type { MediaTargetRenderContext } from '@videojs/media/dom';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = ({ adapterProps: props }: MediaTargetRenderContext<typeof CloudflareAdapter.defaultProps>): string => {
  return embedTemplate({
    src: buildCloudflareIframeSrc(props.src, props),
    allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture',
    attributes: { allowfullscreen: '' },
  });
};

/**
 * @mediaType video
 * @mediaTarget iframe
 */
export class CloudflareVideoElement extends createMediaElement({
  adapter: { constructor: CloudflareAdapter },
  target: iframeTarget(template),
}) {
  static readonly tagName = 'cloudflare-video';
}
