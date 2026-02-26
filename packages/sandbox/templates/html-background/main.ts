// HTML sandbox — Background video player
// http://localhost:5173/html-background/

import '@videojs/html/background/skin.css';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/background/video';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <background-video-player>
    <background-video-skin>
      <background-video slot="media" src="https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/low.mp4"></background-video>
    </background-video-skin>
  </background-video-player>
`;
