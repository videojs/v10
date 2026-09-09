import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/vimeo-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';
import { VIMEO_VIDEO_SRC } from '@app/shared/sources';

createHtmlSandbox({
  player: 'video',
  render: ({ skinTag }) => html`
    <video-player>
      <${skinTag} class="mx-auto aspect-video max-w-4xl">
        <vimeo-video class="block h-full w-full" src="${VIMEO_VIDEO_SRC}" playsinline></vimeo-video>
      </${skinTag}>
    </video-player>
  `,
});
