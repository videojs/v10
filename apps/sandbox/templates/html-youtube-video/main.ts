import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/youtube-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';
import { YOUTUBE_VIDEO_SRC } from '@app/shared/sources';

createHtmlSandbox({
  player: 'video',
  media: () => html`<youtube-video class="block h-full w-full" src="${YOUTUBE_VIDEO_SRC}" playsinline></youtube-video>`,
});
