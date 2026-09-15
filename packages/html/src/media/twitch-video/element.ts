import type { MediaTargetRenderContext } from '@videojs/media/dom';
import { buildTwitchIframeSrc, TwitchAdapter } from '@videojs/twitch-video';

import { createMediaElement, iframeTarget } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = ({ adapterProps: props }: MediaTargetRenderContext<typeof TwitchAdapter.defaultProps>): string => {
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
export class TwitchVideoElement extends createMediaElement({
  adapter: { constructor: TwitchAdapter },
  target: iframeTarget(template),
}) {
  static readonly tagName = 'twitch-video';
}
