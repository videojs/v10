import { propsFromAttributes } from '@videojs/media/dom';
import { buildTwitchIframeSrc, TwitchAdapter } from '@videojs/twitch-video';

import { createMediaElement, iframeHost } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = (attrs: Record<string, string>): string => {
  const props = propsFromAttributes(TwitchAdapter, attrs);

  return embedTemplate({
    src: buildTwitchIframeSrc(props.src, props),
    allow: 'accelerometer; fullscreen; autoplay; encrypted-media; picture-in-picture;',
    attributes: {
      sandbox: 'allow-modals allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox',
      scrolling: 'no',
    },
  });
};

/**
 * @mediaType video
 * @mediaTarget iframe
 */
export class TwitchVideoElement extends createMediaElement({ Adapter: TwitchAdapter, host: iframeHost(template) }) {
  static readonly tagName = 'twitch-video';
}
