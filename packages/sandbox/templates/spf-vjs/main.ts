// SPF + Video.js integration sandbox
// http://localhost:5173/spf-vjs/
//
// Tests SPF fully integrated into a Video.js v10 player with UI controls/skins.
// Uses <spf-video> as the media element inside a standard VJS player.

import { createPlayer, features } from '@videojs/html';
import '@videojs/html/media/spf-video';

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
  </video-player>
`;
