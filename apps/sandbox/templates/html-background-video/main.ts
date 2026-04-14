import '@app/styles.css';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/background/video';
import { BACKGROUND_VIDEO_SRC } from '@app/shared/sources';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <background-video-player>
    <background-video-skin>
      <background-video src="${BACKGROUND_VIDEO_SRC}"></background-video>
    </background-video-skin>
  </background-video-player>
`;
