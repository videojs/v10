import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/media/mux-video';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <mux-video src="${MEDIA.hlsTs.url}" playsinline crossorigin="anonymous">
        <track kind="metadata" label="thumbnails" src="${MEDIA.hlsTs.storyboard}" default />
      </mux-video>
      <img slot="poster" src="${MEDIA.hlsTs.poster}" alt="Video poster" />
    </video-skin>
  </video-player>
`;
