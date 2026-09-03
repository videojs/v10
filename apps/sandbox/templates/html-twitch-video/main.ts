import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/twitch-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';
import { TWITCH_VIDEO_SRC } from '@app/shared/sources';

createHtmlSandbox({
  player: 'video',
  media: () => html`<twitch-video class="block h-full w-full" src="${TWITCH_VIDEO_SRC}" playsinline></twitch-video>`,
});
