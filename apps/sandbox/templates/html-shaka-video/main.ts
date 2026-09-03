import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/shaka-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  poster: 'image',
  media: ({ src, attrs, storyboard }) => html`
    <!-- Shaka plays DASH and HLS from the same element, so the source list here is not
         narrowed to one manifest format the way the dash.js sandbox is. -->
    <shaka-video${src} ${attrs} playsinline crossorigin>${storyboard}</shaka-video>
  `,
});
