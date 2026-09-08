import { buildCloudflareIframeSrc, CloudflareAdapter } from '@videojs/cloudflare-video';
import { propsFromAttributes } from '@videojs/media/dom';

import { createMediaElement } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = (attrs: Record<string, string>): string => {
  const props = propsFromAttributes(CloudflareAdapter, attrs);

  return embedTemplate({
    src: buildCloudflareIframeSrc(props.src, props),
    allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture',
    attributes: { allowfullscreen: '' },
  });
};

export class CloudflareVideoElement extends createMediaElement(CloudflareAdapter, { template }) {
  static readonly tagName = 'cloudflare-video';
}
