import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/youtube-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';
import { YOUTUBE_VIDEO_SRC } from '@app/shared/sources';

createHtmlSandbox({
  player: 'video',
  render: ({ skinTag }) => html`
    <video-player>
      <${skinTag} class="sandbox-video-frame mx-auto max-w-4xl">
        <youtube-video class="block h-full w-full" src="${YOUTUBE_VIDEO_SRC}" playsinline></youtube-video>
      </${skinTag}>
    </video-player>
  `,
});
