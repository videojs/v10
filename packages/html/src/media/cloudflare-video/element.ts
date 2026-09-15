import { buildCloudflareIframeSrc, CloudflareAdapter } from '@videojs/cloudflare-video';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

/**
 * @mediaType video
 * @mediaTarget iframe
 */
export class CloudflareVideoElement extends createMediaElement({
  adapter: { constructor: CloudflareAdapter },
  target: iframeTarget,
  template: ({ adapterProps: props }) =>
    embedTemplate({
      src: buildCloudflareIframeSrc(props.src, props),
      allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture',
      attributes: { allowfullscreen: '' },
    }),
}) {
  static readonly tagName = 'cloudflare-video';
}
