import '@app/styles.css';
import '@videojs/html/video/player';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  render: ({ skinTag, src, attrs, chapters, storyboard, poster }) => html`
    <video-player>
      <${skinTag} class="mx-auto aspect-video max-w-4xl">
        <video${src} ${attrs} playsinline crossorigin>
          ${chapters}
          ${storyboard}
        </video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
      </${skinTag}>
    </video-player>
  `,
});
