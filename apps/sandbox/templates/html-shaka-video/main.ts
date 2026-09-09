import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/shaka-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  render: ({ skinTag, src, attrs, storyboard, poster }) => html`
    <video-player>
      <${skinTag} class="mx-auto aspect-video max-w-4xl">
        <!-- Shaka plays DASH and HLS from the same element, so the source list here is not
             narrowed to one manifest format the way the dash.js sandbox is. -->
        <shaka-video${src} ${attrs} playsinline crossorigin>${storyboard}</shaka-video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
      </${skinTag}>
    </video-player>
  `,
});
