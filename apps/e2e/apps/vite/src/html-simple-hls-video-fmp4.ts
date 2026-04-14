import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/media/simple-hls-video';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <simple-hls-video src="${MEDIA.hlsFmp4.url}" playsinline crossorigin="anonymous" preload="metadata">
        <track kind="metadata" label="thumbnails" src="${MEDIA.hlsFmp4.storyboard}" default />
      </simple-hls-video>
      <img slot="poster" src="${MEDIA.hlsFmp4.poster}" alt="Video poster" />
    </video-skin>
  </video-player>
`;
