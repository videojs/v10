import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/media/dash-video';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <dash-video src="${MEDIA.dash.url}" playsinline></dash-video>
    </video-skin>
  </video-player>
`;
