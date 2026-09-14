import { buildCloudflareIframeSrc, CloudflareAdapter } from '@videojs/cloudflare-video';
import { adapterPropsFromAttributes } from '@videojs/media/dom';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = (attrs: Record<string, string>): string => {
  const props = adapterPropsFromAttributes(CloudflareAdapter, attrs);

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
  Adapter: CloudflareAdapter,
  target: iframeTarget(template),
}) {
  static readonly tagName = 'cloudflare-video';
}
