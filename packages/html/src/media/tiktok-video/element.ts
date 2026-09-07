import { propsFromAttributes } from '@videojs/media/dom';
import { buildTikTokIframeSrc, TikTokAdapter } from '@videojs/tiktok-video';

import { createMediaElement } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = (attrs: Record<string, string>): string => {
  const props = propsFromAttributes(TikTokAdapter, attrs);

  return embedTemplate({
    src: buildTikTokIframeSrc(props.src, props),
    allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture',
    attributes: { title: 'TikTok video player', allowfullscreen: '' },
    // TikTok videos are portrait, and the player refuses to draw its chrome below 325x578, so that is where this host
    // starts rather than the 300x150 the landscape embeds use.
    host: { minWidth: '325px', minHeight: '578px' },
    // Kept out of hit-testing except where the host leaves TikTok's player dormant, which is the same pair of cases
    // shouldBootstrapTikTokEmbed opts out of: then the frame's own controls are the only thing that can still start it.
    withoutControls: ':host(:not([controls]):not([preload="none"])) { pointer-events: none; }',
  });
};

export class TikTokVideoElement extends createMediaElement(TikTokAdapter, { template }) {
  static readonly tagName = 'tiktok-video';
}
