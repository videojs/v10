import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <video src="${MEDIA.mp4.url}" playsinline crossorigin="anonymous">
        <track kind="metadata" label="thumbnails" src="${MEDIA.mp4.storyboard}" default />
      </video>
      <img slot="poster" src="${MEDIA.mp4.poster}" alt="Video poster" />
    </video-skin>
  </video-player>
`;
