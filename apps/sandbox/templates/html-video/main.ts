import '@app/styles.css';
import '@videojs/html/video/player';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  poster: 'image',
  media: ({ src, attrs, chapters, storyboard }) => html`
    <video${src} ${attrs} playsinline crossorigin>
      ${chapters}
      ${storyboard}
    </video>
  `,
});
