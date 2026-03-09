// HTML sandbox — Web player (DOM/Browser)
// http://localhost:5173/html/

import { createPlayer, features, MediaElement } from '@videojs/html';

const { PlayerElement } = createPlayer({
  features: features.video,
});

customElements.define('video-player', PlayerElement);

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"></video>
  </video-player>
`;
