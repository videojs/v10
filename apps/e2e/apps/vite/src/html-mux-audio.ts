import '@videojs/html/audio/player';
import '@videojs/html/audio/skin';
import '@videojs/html/media/mux-audio';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <div style="max-width: 600px; margin: 0 auto">
    <audio-player>
      <audio-skin>
        <mux-audio src="${MEDIA.hlsTs.url}" crossorigin="anonymous"></mux-audio>
      </audio-skin>
    </audio-player>
  </div>
`;
