import '@videojs/html/background/skin.css';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/background/video';
import { BACKGROUND_VIDEO_SRC } from '../shared/sources';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <background-video-player>
    <background-video-skin>
      <background-video slot="media" src="${BACKGROUND_VIDEO_SRC}"></background-video>
    </background-video-skin>
  </background-video-player>
`;
