import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/cloudflare-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';
import { CLOUDFLARE_VIDEO_SRC } from '@app/shared/sources';

createHtmlSandbox({
  player: 'video',
  media: () =>
    html`<cloudflare-video class="block h-full w-full" src="${CLOUDFLARE_VIDEO_SRC}" playsinline></cloudflare-video>`,
});
