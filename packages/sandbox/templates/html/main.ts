// HTML sandbox — Web player (DOM/Browser)
// http://localhost:5173/html/

import '@videojs/html/video/player';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <media-container>
      <video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"></video>
    </media-container>
  </video-player>
`;
