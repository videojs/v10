import '@videojs/html/audio/player';
import '@videojs/html/audio/skin';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <div style="max-width: 600px; margin: 0 auto">
    <audio-player>
      <audio-skin>
        <audio src="${MEDIA.mp4.url}"></audio>
      </audio-skin>
    </audio-player>
  </div>
`;
