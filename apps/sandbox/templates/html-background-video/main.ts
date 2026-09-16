import '@app/styles.css';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/background/video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';
import { BACKGROUND_VIDEO_SRC } from '@app/shared/sources';

createHtmlSandbox({
  player: 'background',
  render: () => html`
    <background-video-player>
      <background-video-skin>
        <background-video src="${BACKGROUND_VIDEO_SRC}" crossorigin></background-video>
      </background-video-skin>
    </background-video-player>
  `,
});
