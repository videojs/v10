import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/live-video/player';
import '@videojs/html/media/hls-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  live: true,
  render: ({ playerTag, skinTag, src, attrs, chapters, storyboard, poster }) => html`
    <${playerTag}>
      <${skinTag} class="sandbox-video-frame mx-auto max-w-4xl">
        <hls-video${src} ${attrs} playsinline crossorigin>
          ${chapters}
          ${storyboard}
        </hls-video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
      </${skinTag}>
    </${playerTag}>
  `,
});
