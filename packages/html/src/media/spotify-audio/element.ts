import { propsFromAttributes } from '@videojs/media/dom';
import { buildSpotifyIframeSrc, SpotifyAdapter } from '@videojs/spotify-audio';

import { createMediaElement } from '../create-media-element';
import { embedTemplate } from '../embed-template';

const template = (attrs: Record<string, string>): string => {
  const props = propsFromAttributes(SpotifyAdapter, attrs);

  return embedTemplate({
    src: buildSpotifyIframeSrc(props.src, props),
    allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
    host: { display: 'block', minWidth: '160px', minHeight: '80px' },
    // Without Spotify's own chrome the embed is a transport and nothing else: its player UI would otherwise show
    // through whatever skin is drawn over it. Hidden rather than merely inert, and important so a consumer's own
    // display rule cannot put it back on screen. An iframe in a hidden subtree still loads and plays its src.
    withoutControls: ':host(:not([controls])) { display: none !important; }',
  });
};

export class SpotifyAudioElement extends createMediaElement(SpotifyAdapter, { template }) {
  static readonly tagName = 'spotify-audio';
}
