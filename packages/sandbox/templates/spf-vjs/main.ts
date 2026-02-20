// SPF + Video.js integration sandbox
// http://localhost:5173/spf-vjs/
//
// Smoke test: SPF as the media element inside a VJS player with UI controls.
// Validates play/pause via the VJS play button wired to the SPF engine.

import { createPlayer, features } from '@videojs/html';
import '@videojs/html/media/spf-video';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/mute-button';

const { PlayerElement } = createPlayer({
  features: features.video,
});

customElements.define('video-player', PlayerElement);

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <spf-video
      src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8"
      preload="auto"
      playsinline
    ></spf-video>
    <media-play-button></media-play-button>
    <media-mute-button></media-mute-button>
  </video-player>
`;
