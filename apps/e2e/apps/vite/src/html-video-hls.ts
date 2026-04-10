import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/media/hls-video';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <hls-video src="${MEDIA.hlsTs.url}" playsinline crossorigin="anonymous">
        <track kind="metadata" label="thumbnails" src="${MEDIA.hlsTs.storyboard}" default />
      </hls-video>
      <img slot="poster" src="${MEDIA.hlsTs.poster}" alt="Video poster" />
    </video-skin>
  </video-player>
`;
