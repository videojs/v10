import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/hls-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  live: true,
  poster: 'image',
  media: ({ src, attrs, chapters, storyboard }) => html`
    <hls-video${src} ${attrs} playsinline crossorigin>
      ${chapters}
      ${storyboard}
    </hls-video>
  `,
});
